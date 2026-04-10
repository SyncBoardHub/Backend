const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

// ─── Supabase Client ─────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// ─── Multer Setup (Memory Storage for Supabase) ─────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const blocked = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.com', '.scr'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (blocked.includes(ext)) return cb(new Error('File type not allowed'), false);
    cb(null, true);
  }
});

// ─── Supabase Storage bucket name ────────────────────────────────────────────
const STORAGE_BUCKET = 'team-files';

// ─── Security: Input Sanitizer ───────────────────────────────────────────────
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').trim();
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const rateLimitMap = new Map();
function rateLimit(windowMs = 60000, maxAttempts = 10) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    if (!rateLimitMap.has(key)) rateLimitMap.set(key, []);
    const attempts = rateLimitMap.get(key).filter(t => now - t < windowMs);
    if (attempts.length >= maxAttempts) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    attempts.push(now);
    rateLimitMap.set(key, attempts);
    next();
  };
}

// ─── Auth Middleware ─────────────────────────────────────────────────────────
async function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) return res.status(401).json({ error: 'Profile not found' });

    req.user = {
      id: profile.id,
      userId: profile.user_id,
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// ─── Auth Routes ─────────────────────────────────────────────────────────────
app.post('/api/auth/register', rateLimit(60000, 5), async (req, res) => {
  let { userId, name, email, password } = req.body;
  email = sanitize(email); name = sanitize(name); userId = sanitize(userId);

  if (!email || !password || !name) return res.status(400).json({ error: 'All fields are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  // Check if userId is taken
  if (userId) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (existing) return res.status(400).json({ error: 'User ID already taken' });
  }

  // Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, user_id: userId }
    }
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    return res.status(400).json({ error: authError.message });
  }

  const authUser = authData.user;
  if (!authUser) return res.status(500).json({ error: 'Registration failed' });

  const avatar = name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);

  // Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authUser.id,
      user_id: userId || authUser.id.substring(0, 8),
      name,
      email,
      avatar
    });

  if (profileError) {
    console.error('Profile creation error:', profileError);
    return res.status(500).json({ error: 'Failed to create profile' });
  }

  const token = authData.session?.access_token;
  if (!token) {
    // Email confirmation might be required — still return success
    return res.json({
      token: '',
      user: { id: authUser.id, userId: userId || authUser.id.substring(0, 8), name, email, avatar },
      message: 'Account created. Check your email for confirmation if auto-login fails.'
    });
  }

  res.json({
    token,
    user: { id: authUser.id, userId: userId || authUser.id.substring(0, 8), name, email, avatar }
  });
});

app.post('/api/auth/login', rateLimit(60000, 10), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: sanitize(email),
    password
  });

  if (error) return res.status(401).json({ error: 'Invalid credentials' });

  const authUser = data.user;
  const token = data.session.access_token;

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (!profile) return res.status(401).json({ error: 'Profile not found. Please register again.' });

  res.json({
    token,
    user: {
      id: profile.id,
      userId: profile.user_id,
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar
    }
  });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json(req.user);
});

// ─── Forgot Password ────────────────────────────────────────────────────────
app.post('/api/auth/forgot-password', rateLimit(60000, 5), async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const { error } = await supabase.auth.resetPasswordForEmail(sanitize(email), {
    redirectTo: `${req.protocol}://${req.get('host')}/reset-password`
  });

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: 'Password reset email sent! Check your inbox.' });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { access_token, password } = req.body;
  if (!access_token || !password) return res.status(400).json({ error: 'Token and new password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  // Create a temporary client with the user's reset token to update their password
  const tempClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${access_token}` } }
  });

  const { error } = await tempClient.auth.updateUser({ password });
  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: 'Password updated successfully! You can now log in.' });
});

// ─── Quick Join via Invite Link ──────────────────────────────────────────────
app.get('/join/:code', async (req, res) => {
  const code = req.params.code.toUpperCase();
  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('invite_code', code)
    .single();

  if (!team) return res.redirect('/login?error=invalid_invite');
  res.redirect(`/app?join=${code}`);
});

// ─── Teams ───────────────────────────────────────────────────────────────────
app.get('/api/teams', auth, async (req, res) => {
  // Get team IDs for this user
  const { data: memberships } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', req.user.id);

  if (!memberships || !memberships.length) return res.json([]);

  const teamIds = memberships.map(m => m.team_id);

  // Get teams
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .in('id', teamIds);

  if (!teams) return res.json([]);

  // Get members for each team
  const result = await Promise.all(teams.map(async (team) => {
    const { data: members } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', team.id);

    const memberIds = (members || []).map(m => m.user_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar')
      .in('id', memberIds);

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      inviteCode: team.invite_code,
      ownerId: team.owner_id,
      githubRepo: team.github_repo || null,
      members: profiles || [],
      createdAt: team.created_at
    };
  }));

  res.json(result);
});

app.post('/api/teams', auth, async (req, res) => {
  const { name, description } = req.body;
  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  const { data: team, error } = await supabase
    .from('teams')
    .insert({
      name: sanitize(name),
      description: sanitize(description),
      invite_code: inviteCode,
      owner_id: req.user.id
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to create team' });

  // Add creator as member
  await supabase
    .from('team_members')
    .insert({ team_id: team.id, user_id: req.user.id });

  const result = {
    id: team.id,
    name: team.name,
    description: team.description,
    inviteCode: team.invite_code,
    ownerId: team.owner_id,
    members: [{ id: req.user.id, name: req.user.name, avatar: req.user.avatar }],
    createdAt: team.created_at
  };

  io.emit('team:created', result);
  res.json(result);
});

app.post('/api/teams/join', auth, async (req, res) => {
  const { code } = req.body;
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('invite_code', sanitize(code))
    .single();

  if (!team) return res.status(404).json({ error: 'Invalid invite code' });

  // Add member (upsert to avoid duplicates)
  await supabase
    .from('team_members')
    .upsert({ team_id: team.id, user_id: req.user.id }, { onConflict: 'team_id,user_id' });

  const result = {
    id: team.id,
    name: team.name,
    description: team.description,
    inviteCode: team.invite_code,
    ownerId: team.owner_id,
    createdAt: team.created_at
  };

  io.emit('team:updated', result);
  res.json(result);
});

// ─── Tasks ───────────────────────────────────────────────────────────────────
app.get('/api/tasks', auth, async (req, res) => {
  const { teamId } = req.query;

  if (teamId) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('team_id', teamId);

    return res.json((tasks || []).map(mapTask));
  }

  // Get all tasks for user's teams
  const { data: memberships } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', req.user.id);

  if (!memberships || !memberships.length) return res.json([]);

  const teamIds = memberships.map(m => m.team_id);
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .in('team_id', teamIds);

  res.json((tasks || []).map(mapTask));
});

app.post('/api/tasks', auth, async (req, res) => {
  const assigneeId = req.body.assigneeId || req.user.id;
  const teamId = req.body.teamId;

  // Validate assignment rules: members cannot assign tasks to leaders
  if (assigneeId && assigneeId !== req.user.id) {
    const { data: team } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', teamId)
      .single();

    if (team) {
      const isCurrentUserLeader = team.owner_id === req.user.id;
      const isAssigneeLeader = team.owner_id === assigneeId;

      // Members cannot assign to leader
      if (!isCurrentUserLeader && isAssigneeLeader) {
        return res.status(403).json({ error: 'Members cannot assign tasks to the team leader' });
      }
    }
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      title: sanitize(req.body.title),
      description: sanitize(req.body.description),
      team_id: teamId,
      status: req.body.status || 'planned',
      assignee_id: assigneeId,
      estimated_time: req.body.estimatedTime || 60,
      due_date: req.body.dueDate || null,
      actual_time: 0,
      timer_running: false,
      timer_start: null
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to create task' });

  const result = mapTask(task);
  io.emit('task:created', result);

  // Send notification to assignee (if different from creator)
  if (assigneeId && assigneeId !== req.user.id) {
    await createNotification(
      assigneeId,
      'task_assigned',
      `${req.user.name} assigned you a task: "${sanitize(req.body.title)}"`,
      task.id,
      teamId
    );
  }

  res.json(result);
});

app.put('/api/tasks/:id', auth, async (req, res) => {
  // Map camelCase from frontend to snake_case for DB
  const updates = {};
  if (req.body.title !== undefined) updates.title = req.body.title;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.status !== undefined) updates.status = req.body.status;
  if (req.body.assigneeId !== undefined) updates.assignee_id = req.body.assigneeId;
  if (req.body.estimatedTime !== undefined) updates.estimated_time = req.body.estimatedTime;
  if (req.body.actualTime !== undefined) updates.actual_time = req.body.actualTime;
  if (req.body.dueDate !== undefined) updates.due_date = req.body.dueDate;
  if (req.body.timerRunning !== undefined) updates.timer_running = req.body.timerRunning;
  if (req.body.timerStart !== undefined) updates.timer_start = req.body.timerStart;

  // Fetch old task to detect status transition to 'done'
  const { data: oldTask } = await supabase
    .from('tasks')
    .select('status, assignee_id')
    .eq('id', req.params.id)
    .single();

  const { data: task, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !task) return res.status(404).json({ error: 'Not found' });

  // Award XP if task just transitioned to 'done'
  if (oldTask && oldTask.status !== 'done' && task.status === 'done') {
    const completedBy = task.assignee_id || req.user.id;
    await awardXP(completedBy, 25, 'Task completed');
    await checkAchievements(completedBy, task);
  }

  const result = mapTask(task);
  io.emit('task:updated', result);
  res.json(result);
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(404).json({ error: 'Not found' });

  io.emit('task:deleted', req.params.id);
  res.json({ success: true });
});

app.post('/api/tasks/:id/timer', auth, async (req, res) => {
  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (!task) return res.status(404).json({ error: 'Not found' });

  const { action } = req.body;
  const updates = {};

  if (action === 'start') {
    updates.timer_running = true;
    updates.timer_start = Date.now();
    updates.status = 'in progress';
  } else if (action === 'stop') {
    let actual = task.actual_time || 0;
    if (task.timer_start) actual += Math.floor((Date.now() - task.timer_start) / 60000);
    updates.actual_time = actual;
    updates.timer_running = false;
    updates.timer_start = null;
  } else if (action === 'complete') {
    let actual = task.actual_time || 0;
    if (task.timer_start) actual += Math.floor((Date.now() - task.timer_start) / 60000);
    updates.actual_time = actual;
    updates.timer_running = false;
    updates.timer_start = null;
    updates.status = 'done';
  }

  const { data: updated } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  // Award XP when task is completed via timer
  if (action === 'complete' && updated) {
    const completedBy = updated.assignee_id || req.user.id;
    await awardXP(completedBy, 25, 'Task completed via timer');
    await checkAchievements(completedBy, updated);
  }

  const result = mapTask(updated);
  io.emit('task:updated', result);
  res.json(result);
});

// Map snake_case DB columns to camelCase for frontend
function mapTask(t) {
  return {
    id: t.id,
    teamId: t.team_id,
    title: t.title,
    description: t.description,
    status: t.status,
    assigneeId: t.assignee_id,
    estimatedTime: t.estimated_time,
    actualTime: t.actual_time,
    dueDate: t.due_date,
    timerRunning: t.timer_running,
    timerStart: t.timer_start,
    createdAt: t.created_at
  };
}

// ─── Notes ───────────────────────────────────────────────────────────────────
app.get('/api/notes', auth, async (req, res) => {
  const { teamId } = req.query;

  let query = supabase.from('notes').select('*');
  if (teamId) query = query.eq('team_id', teamId);

  const { data: notes } = await query;
  res.json((notes || []).map(mapNote));
});

app.post('/api/notes', auth, async (req, res) => {
  const { data: note, error } = await supabase
    .from('notes')
    .insert({
      title: sanitize(req.body.title),
      content: sanitize(req.body.content),
      team_id: req.body.teamId,
      author_id: req.user.id
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to create note' });

  const result = mapNote(note);
  io.emit('note:created', result);
  res.json(result);
});

app.put('/api/notes/:id', auth, async (req, res) => {
  const updates = {};
  if (req.body.title !== undefined) updates.title = req.body.title;
  if (req.body.content !== undefined) updates.content = req.body.content;
  updates.updated_at = new Date().toISOString();

  const { data: note, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !note) return res.status(404).json({ error: 'Not found' });

  const result = mapNote(note);
  io.emit('note:updated', result);
  res.json(result);
});

app.delete('/api/notes/:id', auth, async (req, res) => {
  await supabase.from('notes').delete().eq('id', req.params.id);
  io.emit('note:deleted', req.params.id);
  res.json({ success: true });
});

function mapNote(n) {
  return {
    id: n.id,
    teamId: n.team_id,
    title: n.title,
    content: n.content,
    authorId: n.author_id,
    updatedAt: n.updated_at
  };
}

// ─── Files (Supabase Cloud Storage) ─────────────────────────────────────────
function formatFileSize(bytes) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

app.get('/api/files', auth, async (req, res) => {
  const { teamId } = req.query;

  let query = supabase.from('files').select('*');
  if (teamId) query = query.eq('team_id', teamId);

  const { data: files } = await query;
  res.json((files || []).map(mapFile));
});

app.post('/api/files/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const teamId = req.body.teamId;
  if (!teamId) return res.status(400).json({ error: 'Team is required' });

  const sizeStr = formatFileSize(req.file.size);
  const storagePath = `${teamId}/${Date.now()}-${uuidv4().substring(0, 8)}-${req.file.originalname}`;

  // Upload buffer to Supabase Storage
  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false
    });

  if (storageError) {
    console.error('Storage upload error:', storageError);
    return res.status(500).json({ error: 'Failed to upload file to cloud storage' });
  }

  const { data: file, error } = await supabase
    .from('files')
    .insert({
      team_id: teamId,
      name: sanitize(req.file.originalname),
      size: sizeStr,
      storage_path: storagePath,
      uploaded_by: req.user.id
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to save file metadata' });

  // Award achievement for first file upload
  await checkFileUploadAchievement(req.user.id);

  const result = mapFile(file);
  io.emit('file:uploaded', result);
  res.json(result);
});

app.post('/api/files/import-url', auth, async (req, res) => {
  const { url, teamId } = req.body;
  if (!url || !teamId) return res.status(400).json({ error: 'URL and team are required' });

  try {
    const httpModule = url.startsWith('https') ? require('https') : require('http');
    const fileName = sanitize(decodeURIComponent(url.split('/').pop().split('?')[0] || 'imported-file'));

    httpModule.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400) {
        return res.status(400).json({ error: 'URL redirects are not supported. Use the direct file link.' });
      }
      if (response.statusCode !== 200) {
        return res.status(400).json({ error: 'Failed to download file from URL' });
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        const sizeStr = formatFileSize(buffer.length);
        const storagePath = `${teamId}/${Date.now()}-${uuidv4().substring(0, 8)}-${fileName}`;

        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, buffer, {
            contentType: response.headers['content-type'] || 'application/octet-stream',
            upsert: false
          });

        if (storageError) {
          return res.status(500).json({ error: 'Failed to upload to cloud storage' });
        }

        const { data: file } = await supabase
          .from('files')
          .insert({
            team_id: teamId,
            name: fileName,
            size: sizeStr,
            storage_path: storagePath,
            uploaded_by: req.user.id
          })
          .select()
          .single();

        const result = mapFile(file);
        io.emit('file:uploaded', result);
        res.json(result);
      });

      response.on('error', () => {
        res.status(500).json({ error: 'Failed to download file' });
      });
    }).on('error', () => {
      res.status(400).json({ error: 'Failed to fetch URL' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Import failed' });
  }
});

app.get('/api/files/:id/download', auth, async (req, res) => {
  const { data: file } = await supabase
    .from('files')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (!file) return res.status(404).json({ error: 'File not found' });

  const storagePath = file.storage_path || file.stored_name;
  if (!storagePath) return res.status(404).json({ error: 'No file available for download' });

  // Generate a signed URL (valid for 1 hour)
  const { data: signedData, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (error || !signedData) {
    return res.status(500).json({ error: 'Failed to generate download link' });
  }

  res.json({ url: signedData.signedUrl, filename: file.name });
});

app.delete('/api/files/:id', auth, async (req, res) => {
  const { data: file } = await supabase
    .from('files')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (!file) return res.status(404).json({ error: 'Not found' });

  // Delete from Supabase Storage
  const storagePath = file.storage_path || file.stored_name;
  if (storagePath) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
  }

  await supabase.from('files').delete().eq('id', req.params.id);
  io.emit('file:deleted', req.params.id);
  res.json({ success: true });
});

function mapFile(f) {
  return {
    id: f.id,
    teamId: f.team_id,
    name: f.name,
    size: f.size,
    storagePath: f.storage_path,
    uploadedBy: f.uploaded_by,
    uploadedAt: f.uploaded_at
  };
}

// ─── Analytics ───────────────────────────────────────────────────────────────
app.get('/api/analytics', auth, async (req, res) => {
  const { teamId } = req.query;

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('team_id', teamId);

  const allTasks = tasks || [];

  const { data: members } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId);

  const memberIds = (members || []).map(m => m.user_id);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, avatar')
    .in('id', memberIds);

  const done = allTasks.filter(t => t.status === 'done').length;
  const inProgress = allTasks.filter(t => t.status === 'in progress').length;
  const planned = allTasks.filter(t => t.status === 'planned').length;

  const stats = {
    total: allTasks.length,
    done,
    inProgress,
    planned,
    completionRate: allTasks.length ? Math.round(done / allTasks.length * 100) : 0,
    memberWorkload: (profiles || []).map(p => {
      const memberTasks = allTasks.filter(t => t.assignee_id === p.id);
      return {
        name: p.name,
        avatar: p.avatar,
        tasks: memberTasks.length,
        done: memberTasks.filter(t => t.status === 'done').length
      };
    })
  };

  res.json(stats);
});

// ─── Search ──────────────────────────────────────────────────────────────────
app.get('/api/search', auth, async (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  if (!q) return res.json({ tasks: [], notes: [] });

  // Get user's team IDs
  const { data: memberships } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', req.user.id);

  if (!memberships || !memberships.length) return res.json({ tasks: [], notes: [] });
  const teamIds = memberships.map(m => m.team_id);

  // Search tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .in('team_id', teamIds)
    .or(`title.ilike.%${q}%,description.ilike.%${q}%`);

  // Search notes
  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .in('team_id', teamIds)
    .or(`title.ilike.%${q}%,content.ilike.%${q}%`);

  res.json({
    tasks: (tasks || []).map(mapTask),
    notes: (notes || []).map(mapNote)
  });
});

// ─── Team Members with Roles ─────────────────────────────────────────────────
app.get('/api/teams/:id/members', auth, async (req, res) => {
  const teamId = req.params.id;

  // Get team to find owner
  const { data: team } = await supabase
    .from('teams')
    .select('owner_id')
    .eq('id', teamId)
    .single();

  if (!team) return res.status(404).json({ error: 'Team not found' });

  // Get members
  const { data: members } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId);

  const memberIds = (members || []).map(m => m.user_id);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, user_id, name, email, avatar')
    .in('id', memberIds);

  const result = (profiles || []).map(p => ({
    id: p.id,
    userId: p.user_id,
    name: p.name,
    email: p.email,
    avatar: p.avatar,
    role: p.id === team.owner_id ? 'leader' : 'member'
  }));

  res.json(result);
});

// ─── Extend Time (Leader Only) ───────────────────────────────────────────────
app.post('/api/tasks/:id/extend-time', auth, async (req, res) => {
  const { additionalMinutes } = req.body;
  if (!additionalMinutes || additionalMinutes <= 0) {
    return res.status(400).json({ error: 'Provide positive additional minutes' });
  }

  // Get task
  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Check if user is leader of the task's team
  const { data: team } = await supabase
    .from('teams')
    .select('owner_id')
    .eq('id', task.team_id)
    .single();

  if (!team || team.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the team leader can extend time' });
  }

  const newEstimate = (task.estimated_time || 0) + parseInt(additionalMinutes);

  const { data: updated } = await supabase
    .from('tasks')
    .update({ estimated_time: newEstimate })
    .eq('id', req.params.id)
    .select()
    .single();

  const result = mapTask(updated);
  io.emit('task:updated', result);
  res.json(result);
});

// ─── Notifications ───────────────────────────────────────────────────────────
app.get('/api/notifications', auth, async (req, res) => {
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  res.json((notifications || []).map(n => ({
    id: n.id,
    type: n.type,
    message: n.message,
    taskId: n.task_id,
    teamId: n.team_id,
    read: n.read,
    createdAt: n.created_at
  })));
});

app.put('/api/notifications/:id/read', auth, async (req, res) => {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  res.json({ success: true });
});

app.put('/api/notifications/read-all', auth, async (req, res) => {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', req.user.id)
    .eq('read', false);

  res.json({ success: true });
});

// Helper: create notification
async function createNotification(userId, type, message, taskId, teamId) {
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      message,
      task_id: taskId || null,
      team_id: teamId || null
    });

  io.emit('notification:new', { userId, type, message });
}

// ─── GitHub Integration ──────────────────────────────────────────────────────
app.post('/api/teams/:id/github', auth, async (req, res) => {
  const { repoUrl } = req.body;
  const teamId = req.params.id;

  // Verify user is leader
  const { data: team } = await supabase
    .from('teams')
    .select('owner_id')
    .eq('id', teamId)
    .single();

  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the team leader can link a GitHub repo' });
  }

  // Parse and validate GitHub URL
  let githubRepo = null;
  if (repoUrl) {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return res.status(400).json({ error: 'Invalid GitHub URL. Use format: https://github.com/owner/repo' });
    githubRepo = `${match[1]}/${match[2]}`.replace(/\.git$/, '');
  }

  await supabase
    .from('teams')
    .update({ github_repo: githubRepo })
    .eq('id', teamId);

  res.json({ success: true, githubRepo });
});

// Proxy GitHub API — browse repo contents
app.get('/api/github/contents/:owner/:repo', auth, async (req, res) => {
  const { owner, repo } = req.params;
  const path = req.query.path || '';

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'SyncBoard' }
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.message || 'GitHub API error' });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch from GitHub' });
  }
});

// Get file content from GitHub
app.get('/api/github/file/:owner/:repo/*', auth, async (req, res) => {
  const { owner, repo } = req.params;
  const filePath = req.params[0] || '';

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'SyncBoard' }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'File not found' });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch file from GitHub' });
  }
});

// ─── Gamification: XP & Achievements ─────────────────────────────────────────

// Award XP to a user and level up if threshold reached
async function awardXP(userId, amount, reason) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('xp_points, level')
    .eq('id', userId)
    .single();

  if (!profile) return;

  const newXP = (profile.xp_points || 0) + amount;
  // Level formula: level up every 200 XP
  const newLevel = Math.floor(newXP / 200) + 1;
  const didLevelUp = newLevel > (profile.level || 1);

  await supabase
    .from('profiles')
    .update({ xp_points: newXP, level: newLevel })
    .eq('id', userId);

  // Emit XP update to client
  io.emit('xp:updated', { userId, xp: newXP, level: newLevel, gained: amount, reason });

  if (didLevelUp) {
    io.emit('level:up', { userId, level: newLevel });
  }
}

// Check and unlock achievements after task completion
async function checkAchievements(userId, completedTask) {
  // Get all achievements
  const { data: allAchievements } = await supabase.from('achievements').select('*');
  if (!allAchievements) return;

  // Get user's already-unlocked achievements
  const { data: unlocked } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);
  const unlockedIds = new Set((unlocked || []).map(u => u.achievement_id));

  // Count user's total completed tasks
  const { count: doneCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('assignee_id', userId)
    .eq('status', 'done');

  // Count tasks completed today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: todayCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('assignee_id', userId)
    .eq('status', 'done')
    .gte('created_at', today.toISOString());

  // Check time-based conditions
  const actualMinutes = completedTask.actual_time || 0;
  const currentHour = new Date().getHours();

  const triggers = {
    'first_task':       doneCount >= 1,
    'five_tasks':       doneCount >= 5,
    'ten_tasks':        doneCount >= 10,
    'twenty_five_tasks':doneCount >= 25,
    'speed_demon':      actualMinutes > 0 && actualMinutes < 10,
    'streak_3':         todayCount >= 3,
    'night_owl':        currentHour >= 0 && currentHour < 5
  };

  for (const achievement of allAchievements) {
    if (unlockedIds.has(achievement.id)) continue;
    if (!triggers[achievement.key]) continue;

    // Unlock achievement
    const { error } = await supabase
      .from('user_achievements')
      .insert({ user_id: userId, achievement_id: achievement.id });

    if (!error) {
      // Award bonus XP
      await awardXP(userId, achievement.xp_reward, `Achievement: ${achievement.title}`);

      // Emit to client
      io.emit('achievement:unlocked', {
        userId,
        achievement: {
          id: achievement.id,
          key: achievement.key,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          xpReward: achievement.xp_reward
        }
      });
    }
  }
}

// Check first file upload achievement
async function checkFileUploadAchievement(userId) {
  const { data: allAchievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('key', 'file_uploader')
    .single();

  if (!allAchievements) return;

  const { data: already } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)
    .eq('achievement_id', allAchievements.id)
    .single();

  if (already) return;

  await supabase
    .from('user_achievements')
    .insert({ user_id: userId, achievement_id: allAchievements.id });

  await awardXP(userId, allAchievements.xp_reward, `Achievement: ${allAchievements.title}`);

  io.emit('achievement:unlocked', {
    userId,
    achievement: {
      id: allAchievements.id,
      key: allAchievements.key,
      title: allAchievements.title,
      description: allAchievements.description,
      icon: allAchievements.icon,
      xpReward: allAchievements.xp_reward
    }
  });
}

// ─── Gamification API Routes ─────────────────────────────────────────────────

// Get user's XP and level
app.get('/api/xp', auth, async (req, res) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('xp_points, level')
    .eq('id', req.user.id)
    .single();

  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const xp = profile.xp_points || 0;
  const level = profile.level || 1;
  const xpForNextLevel = level * 200;
  const xpInCurrentLevel = xp - ((level - 1) * 200);

  res.json({
    xp,
    level,
    xpInCurrentLevel,
    xpForNextLevel: 200,
    progress: Math.min(Math.round((xpInCurrentLevel / 200) * 100), 100)
  });
});

// Get all achievements + user's unlock status
app.get('/api/achievements', auth, async (req, res) => {
  const { data: allAchievements } = await supabase
    .from('achievements')
    .select('*')
    .order('xp_reward', { ascending: true });

  const { data: userAchievements } = await supabase
    .from('user_achievements')
    .select('achievement_id, unlocked_at')
    .eq('user_id', req.user.id);

  const unlockedMap = {};
  (userAchievements || []).forEach(ua => {
    unlockedMap[ua.achievement_id] = ua.unlocked_at;
  });

  const result = (allAchievements || []).map(a => ({
    id: a.id,
    key: a.key,
    title: a.title,
    description: a.description,
    icon: a.icon,
    xpReward: a.xp_reward,
    unlocked: !!unlockedMap[a.id],
    unlockedAt: unlockedMap[a.id] || null
  }));

  res.json(result);
});

// ─── Socket.io (with Presence Tracking) ──────────────────────────────────────
const onlineUsers = new Map(); // Map<socketId, { userId, teamId }>

io.on('connection', (socket) => {
  socket.on('join:team', ({ teamId, userId }) => {
    socket.join(teamId);

    if (userId) {
      onlineUsers.set(socket.id, { userId, teamId });
      // Broadcast to team that user is online
      io.to(teamId).emit('team:member_online', { userId });

      // Send current online list to the joining user
      const teamOnline = [];
      onlineUsers.forEach((val) => {
        if (val.teamId === teamId) teamOnline.push(val.userId);
      });
      socket.emit('team:online_list', [...new Set(teamOnline)]);
    }
  });

  socket.on('note:typing', (data) => socket.to(data.teamId).emit('note:typing', data));

  socket.on('disconnect', () => {
    const userData = onlineUsers.get(socket.id);
    if (userData) {
      onlineUsers.delete(socket.id);
      // Check if user has other active sockets in the same team
      let stillOnline = false;
      onlineUsers.forEach((val) => {
        if (val.userId === userData.userId && val.teamId === userData.teamId) stillOnline = true;
      });
      if (!stillOnline) {
        io.to(userData.teamId).emit('team:member_offline', { userId: userData.userId });
      }
    }
  });
});

// ─── Error Handler for Multer ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large (max 50MB)' });
    return res.status(400).json({ error: err.message });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`\n✅ TeamSync API running at http://localhost:${PORT}\n\nFront-end: React (Vite) in /client directory\n🎮 Gamification: XP + Achievements active\n☁️  Storage: Supabase Cloud\n🔗 Connected to Supabase: ${process.env.SUPABASE_URL}\n`));
