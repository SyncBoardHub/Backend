'use strict';

const { Server } = require('socket.io');
const env = require('../config/env');
const logger = require('../utils/logger');
const { supabase, supabaseAuth } = require('../config/supabase');

// In-memory presence map: Map<socketId, { userId, teamId }>
// When Redis is available, this is augmented by the Redis adapter for cross-instance awareness
const onlineUsers = new Map();

/**
 * Configures and attaches Socket.IO to the HTTP server.
 * Optionally attaches the Redis adapter for horizontal scaling.
 * Returns the io instance for use in route handlers.
 */
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS,
      credentials: true
    }
  });

  // Attach Redis adapter if available (enables cross-instance pub/sub)
  (async () => {
    try {
      const { createAdapter } = require('@socket.io/redis-adapter');
      const { getRedisClient, getPublisherClient } = require('../config/redis');
      const pubClient = await getPublisherClient();
      const subClient = await getRedisClient();

      if (pubClient && subClient) {
        const subDuplicate = subClient.duplicate();
        await subDuplicate.connect();
        io.adapter(createAdapter(pubClient, subDuplicate));
        logger.info('Socket.IO Redis adapter connected — horizontal scaling enabled');
      } else {
        logger.debug('Redis unavailable — Socket.IO running with in-memory adapter');
      }
    } catch (err) {
      logger.debug({ err: err.message }, 'Socket.IO Redis adapter not loaded — using in-memory adapter');
    }
  })();

  // ─── Socket Auth Middleware ─────────────────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));

    try {
      const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
      if (error || !user) return next(new Error('Unauthorized'));
      socket.userId = user.id;
      next();
    } catch (err) {
      next(new Error('Unauthorized'));
    }
  });

  // ─── Socket Event Handlers ──────────────────────────────────────────────────
  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id, userId: socket.userId }, 'Socket connected');

    socket.on('join:team', async ({ teamId }) => {
      if (!teamId) return;

      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('team_id', teamId)
        .eq('user_id', socket.userId)
        .maybeSingle();

      if (!membership) {
        socket.emit('team:error', { error: 'You are not a member of this team.' });
        return;
      }

      socket.join(teamId);
      socket.data.teamId = teamId;
      const userId = socket.userId;

      if (userId) {
        onlineUsers.set(socket.id, { userId, teamId });
        io.to(teamId).emit('team:member_online', { userId });

        // Send current online list to the joining user
        const teamOnline = [];
        onlineUsers.forEach(val => {
          if (val.teamId === teamId) teamOnline.push(val.userId);
        });
        socket.emit('team:online_list', [...new Set(teamOnline)]);
      }
    });

    socket.on('leave:team', (teamId) => {
      if (!teamId || socket.data.teamId !== teamId) return;
      socket.leave(teamId);
      onlineUsers.delete(socket.id);
      socket.data.teamId = null;
      io.to(teamId).emit('team:member_offline', { userId: socket.userId });
    });

    socket.on('note:typing', async (data) => {
      if (!data?.teamId) return;
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('team_id', data.teamId)
        .eq('user_id', socket.userId)
        .maybeSingle();
      if (membership) {
        socket.to(data.teamId).emit('note:typing', { ...data, userId: socket.userId });
      }
    });

    socket.on('disconnect', () => {
      const userData = onlineUsers.get(socket.id);
      if (userData) {
        onlineUsers.delete(socket.id);
        // Only announce offline if user has no other sockets in the same team
        let stillOnline = false;
        onlineUsers.forEach(val => {
          if (val.userId === userData.userId && val.teamId === userData.teamId) {
            stillOnline = true;
          }
        });
        if (!stillOnline) {
          io.to(userData.teamId).emit('team:member_offline', { userId: userData.userId });
        }
      }
      logger.debug({ socketId: socket.id }, 'Socket disconnected');
    });
  });

  return io;
}

module.exports = { initSocket, onlineUsers };
