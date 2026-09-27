'use strict';

const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { STORAGE_BUCKET, BLOCKED_EXTENSIONS, MAX_FILE_SIZE_BYTES } = require('../constants');
const { validateExternalUrl } = require('../utils/ssrf');
const activityService = require('./activity.service');
const logger = require('../utils/logger');

function formatFileSize(bytes) {
  if (bytes >= 1_048_576) return (bytes / 1_048_576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function mapFile(f) {
  return {
    id: f.id,
    teamId: f.team_id,
    name: f.name,
    originalName: f.original_name,
    customName: f.custom_name,
    size: f.size,
    storagePath: f.storage_path,
    uploadedBy: f.uploaded_by,
    uploadedAt: f.uploaded_at
  };
}

/**
 * Multer file filter — blocks dangerous executables.
 */
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return cb(new Error('File type not allowed'), false);
  }
  cb(null, true);
}

async function getFiles(userId, teamId) {
  let query = supabase.from('files').select('*');
  if (teamId) {
    query = query.eq('team_id', teamId);
  } else {
    const { data: memberships } = await supabase.from('team_members').select('team_id').eq('user_id', userId);
    const teamIds = (memberships || []).map(m => m.team_id);
    if (!teamIds.length) return [];
    query = query.in('team_id', teamIds);
  }
  const { data: files } = await query;
  return (files || []).map(mapFile);
}

async function uploadFile(actor, multerFile, { teamId, customName }, io) {
  if (!multerFile) throw Object.assign(new Error('No file provided'), { status: 400 });
  if (!supabaseAdmin) throw Object.assign(new Error('Server service-role configuration is required.'), { status: 503 });

  const originalName = multerFile.originalname;
  const ext = originalName.includes('.') ? '.' + originalName.split('.').pop() : '';
  let displayName;
  if (customName?.trim()) {
    const safeName = customName.trim().replace(/[^a-zA-Z0-9\-_ .()[\]]/g, '').substring(0, 80);
    displayName = safeName.endsWith(ext) ? safeName : safeName + ext;
  } else {
    displayName = originalName.replace(/[<>]/g, '').trim();
  }

  const storageKeySafeName = displayName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const sizeStr = formatFileSize(multerFile.size);
  const storagePath = `${teamId}/${Date.now()}-${uuidv4().substring(0, 8)}-${storageKeySafeName}`;

  const { error: storageError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, multerFile.buffer, { contentType: multerFile.mimetype, upsert: false });

  if (storageError) {
    logger.error({ err: JSON.stringify(storageError) }, 'Storage upload error');
    throw Object.assign(new Error('File upload failed'), { status: 500 });
  }

  const { data: file, error } = await supabase.from('files').insert({
    team_id: teamId,
    name: displayName,
    original_name: originalName,
    custom_name: customName?.trim() || null,
    size: sizeStr,
    storage_path: storagePath,
    uploaded_by: actor.id
  }).select().single();

  if (error) {
    await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw Object.assign(new Error('Failed to save file metadata'), { status: 500 });
  }

  const result = mapFile(file);
  io.to(teamId).emit('file:uploaded', result);
  void activityService.recordActivity({ teamId, actor, entityType: 'file', entityId: file.id, action: 'uploaded', metadata: { name: file.name, size: file.size }, io });
  return result;
}

async function importFromUrl(actor, { url, teamId, customName }, io) {
  if (!supabaseAdmin) throw Object.assign(new Error('Server service-role configuration is required.'), { status: 503 });
  if (!url || !teamId) throw Object.assign(new Error('URL and team are required'), { status: 400 });

  const externalUrl = await validateExternalUrl(url);
  const httpModule = externalUrl.startsWith('https') ? require('https') : require('http');
  const rawName = decodeURIComponent(new URL(externalUrl).pathname.split('/').pop() || 'imported-file');
  const ext = rawName.includes('.') ? '.' + rawName.split('.').pop() : '';

  let displayName;
  if (customName?.trim()) {
    const safeName = customName.trim().replace(/[^a-zA-Z0-9\-_ .()[\]]/g, '').substring(0, 80);
    displayName = safeName.endsWith(ext) ? safeName : safeName + ext;
  } else {
    displayName = rawName.replace(/[<>]/g, '').trim();
  }

  return new Promise((resolve, reject) => {
    httpModule.get(externalUrl, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400) {
        return reject(Object.assign(new Error('URL redirects are not supported. Use the direct file link.'), { status: 400 }));
      }
      if (response.statusCode !== 200) {
        return reject(Object.assign(new Error('Failed to download file from URL'), { status: 400 }));
      }

      const chunks = [];
      let totalBytes = 0;
      response.on('data', chunk => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_FILE_SIZE_BYTES) {
          response.destroy();
          return reject(Object.assign(new Error('Imported file is too large (max 50MB)'), { status: 413 }));
        }
        chunks.push(chunk);
      });

      response.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const sizeStr = formatFileSize(buffer.length);
          const storageKeySafeName = displayName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const storagePath = `${teamId}/${Date.now()}-${uuidv4().substring(0, 8)}-${storageKeySafeName}`;

          const { error: storageError } = await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, buffer, { contentType: response.headers['content-type'] || 'application/octet-stream', upsert: false });

          if (storageError) {
            logger.error({ err: JSON.stringify(storageError) }, 'URL import storage error');
            return reject(Object.assign(new Error('File import failed'), { status: 500 }));
          }

          const { data: file, error } = await supabase.from('files').insert({
            team_id: teamId, name: displayName, original_name: rawName,
            custom_name: customName?.trim() || null, size: sizeStr,
            storage_path: storagePath, uploaded_by: actor.id
          }).select().single();

          if (error || !file) {
            await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([storagePath]);
            return reject(Object.assign(new Error('Failed to save file metadata'), { status: 500 }));
          }

          const result = mapFile(file);
          io.to(teamId).emit('file:uploaded', result);
          void activityService.recordActivity({ teamId, actor, entityType: 'file', entityId: file.id, action: 'uploaded', metadata: { name: file.name, size: file.size }, io });
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      response.on('error', () => reject(Object.assign(new Error('Failed to download file'), { status: 500 })));
    }).on('error', () => reject(Object.assign(new Error('Failed to fetch URL'), { status: 400 })));
  });
}

async function getDownloadUrl(fileId, userId) {
  if (!supabaseAdmin) throw Object.assign(new Error('Server service-role configuration is required.'), { status: 503 });

  const { data: file } = await supabase.from('files').select('*').eq('id', fileId).single();
  if (!file) throw Object.assign(new Error('File not found'), { status: 404 });

  const storagePath = file.storage_path || file.stored_name;
  if (!storagePath) throw Object.assign(new Error('No file available for download'), { status: 404 });

  const { data: signedData, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (error || !signedData) throw Object.assign(new Error('Failed to generate download link'), { status: 500 });
  return { url: signedData.signedUrl, filename: file.name };
}

async function deleteFile(actor, fileId, io) {
  if (!supabaseAdmin) throw Object.assign(new Error('Server service-role configuration is required.'), { status: 503 });

  const { data: file } = await supabase.from('files').select('*').eq('id', fileId).single();
  if (!file) throw Object.assign(new Error('Not found'), { status: 404 });

  const storagePath = file.storage_path || file.stored_name;
  if (storagePath) {
    await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([storagePath]);
  }

  const { error } = await supabase.from('files').delete().eq('id', fileId);
  if (error) throw Object.assign(new Error('Failed to delete file metadata'), { status: 500 });

  io.to(file.team_id).emit('file:deleted', fileId);
  void activityService.recordActivity({ teamId: file.team_id, actor, entityType: 'file', entityId: fileId, action: 'deleted', metadata: { name: file.name }, io });
  return { success: true };
}

module.exports = { mapFile, fileFilter, getFiles, uploadFile, importFromUrl, getDownloadUrl, deleteFile };
