'use strict';

const router = require('express').Router();
const authRoutes = require('./auth.routes');
const profileRoutes = require('./profile.routes');
const teamRoutes = require('./team.routes');
const taskRoutes = require('./task.routes');
const milestoneRoutes = require('./milestone.routes');
const noteRoutes = require('./note.routes');
const fileRoutes = require('./file.routes');
const notificationRoutes = require('./notification.routes');
const activityRoutes = require('./activity.routes');
const searchRoutes = require('./search.routes');
const githubRoutes = require('./github.routes');
const aiRoutes = require('./ai.routes');
const adminRoutes = require('./admin.routes');
const healthRoutes = require('./health.routes');
const notFound = require('../middleware/notFound');

// Health endpoints at root
router.use('/', healthRoutes);

// Public /join/:code
router.use('/', teamRoutes);

// API router
const apiRouter = require('express').Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/', profileRoutes);
apiRouter.use('/', teamRoutes);
apiRouter.use('/tasks', taskRoutes);
apiRouter.use('/milestones', milestoneRoutes);
apiRouter.use('/', noteRoutes);
apiRouter.use('/files', fileRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/activity', activityRoutes);
apiRouter.use('/search', searchRoutes);
apiRouter.use('/github', githubRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/admin', adminRoutes);

// 404 handler for unmatched /api routes
apiRouter.use(notFound);

router.use('/api', apiRouter);

module.exports = router;
