import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2, Link, X, CloudUpload } from 'lucide-react';
import { api, apiUpload } from '../lib/api';
import socket from '../lib/socket';

const FILE_ICONS = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', ppt: '📽️', pptx: '📽️',
  png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️',
  zip: '📦', rar: '📦', '7z': '📦', mp4: '🎬', mp3: '🎵', txt: '📃', csv: '📊',
  js: '💛', jsx: '💛', ts: '💙', tsx: '💙', py: '🐍', java: '☕', html: '🌐', css: '🎨',
};
function getFileIcon(name) { const ext = name?.split('.').pop()?.toLowerCase(); return FILE_ICONS[ext] || '📎'; }

export default function FilesPanel({ teamId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const fetchFiles = useCallback(async () => {
    if (!teamId) return;
    const data = await api(`/api/files?teamId=${teamId}`);
    if (data && Array.isArray(data)) setFiles(data);
    setLoading(false);
  }, [teamId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  useEffect(() => {
    const handleUploaded = (file) => {
      if (file.teamId === teamId) {
        setFiles(prev => {
          if (prev.find(f => f.id === file.id)) return prev;
          return [...prev, file];
        });
      }
    };
    const handleDeleted = (id) => setFiles(prev => prev.filter(f => f.id !== id));
    socket.on('file:uploaded', handleUploaded);
    socket.on('file:deleted', handleDeleted);
    return () => { socket.off('file:uploaded', handleUploaded); socket.off('file:deleted', handleDeleted); };
  }, [teamId]);

  const uploadFile = async (file) => {
    if (uploading) return; // Prevent double-click
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('teamId', teamId);
      const result = await apiUpload('/api/files/upload', formData);
      if (result?.error) {
        setError(result.error);
      } else {
        await fetchFiles(); // Force refresh
      }
    } catch (e) {
      setError('Upload failed');
    }
    setUploading(false);
    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const downloadFile = async (id) => {
    const data = await api(`/api/files/${id}/download`);
    if (data?.url) window.open(data.url, '_blank');
  };

  const deleteFile = async (id) => {
    await api(`/api/files/${id}`, 'DELETE');
    setFiles(prev => prev.filter(f => f.id !== id)); // Immediate UI update
  };

  const importFromUrl = async (e) => {
    e.preventDefault();
    if (!importUrl.trim() || uploading) return;
    setUploading(true);
    setError('');
    const result = await api('/api/files/import-url', 'POST', { url: importUrl, teamId });
    if (result?.error) setError(result.error);
    else await fetchFiles();
    setImportUrl('');
    setShowUrlModal(false);
    setUploading(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Upload Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          dragOver ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
        }`}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
        <CloudUpload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-purple-400' : 'text-gray-500'}`} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-purple-400 text-sm font-medium">Uploading...</p>
          </div>
        ) : (
          <>
            <p className="text-gray-300 text-sm font-medium">Drop files here or click to upload</p>
            <p className="text-gray-500 text-xs mt-1">Max 50MB per file</p>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={() => setShowUrlModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-all">
          <Link className="w-4 h-4" /> Import from URL
        </button>
      </div>

      {/* File List */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        <AnimatePresence>
          {files.map((file, i) => (
            <motion.div key={file.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ delay: i * 0.02 }}
              className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all">
              <span className="text-2xl">{getFileIcon(file.name)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                <p className="text-[10px] text-gray-500">{file.size} • {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : ''}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); downloadFile(file.id); }} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-all">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {files.length === 0 && <p className="text-center text-gray-600 text-sm py-8">No files uploaded yet</p>}
      </div>

      {/* Import URL Modal */}
      <AnimatePresence>
        {showUrlModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowUrlModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-panel rounded-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Import from URL</h3>
                <button onClick={() => setShowUrlModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={importFromUrl} className="space-y-4">
                <input type="url" placeholder="https://example.com/file.pdf" value={importUrl} onChange={e => setImportUrl(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <button type="submit" disabled={uploading}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl py-3 font-semibold disabled:opacity-50 transition-all">
                  {uploading ? 'Importing...' : 'Import File'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
