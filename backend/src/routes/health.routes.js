'use strict';

const router = require('express').Router();
const { supabase } = require('../config/supabase');
const env = require('../config/env');
const logger = require('../utils/logger');

router.get('/healthz', (req, res) => {
  res.json({
    status: 'ok',
    service: 'syncboard-api',
    timestamp: new Date().toISOString()
  });
});

router.get('/readyz', async (req, res) => {
  const checks = {
    serviceRole: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    profiles: false,
    activityEvents: false,
    milestones: false
  };

  if (!checks.serviceRole) {
    return res.status(503).json({ status: 'not_ready', service: 'syncboard-api', checks });
  }

  try {
    const results = await Promise.all([
      supabase.from('profiles').select('id').limit(1),
      supabase.from('activity_events').select('id').limit(1),
      supabase.from('milestones').select('id').limit(1)
    ]);

    checks.profiles = !results[0].error;
    checks.activityEvents = !results[1].error;
    checks.milestones = !results[2].error;

    if (Object.values(checks).some((check) => !check)) {
      return res.status(503).json({ status: 'not_ready', service: 'syncboard-api', checks });
    }

    return res.json({
      status: 'ready',
      service: 'syncboard-api',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error({ err: error.message }, 'Readiness check failed');
    return res.status(503).json({ status: 'not_ready', service: 'syncboard-api', checks });
  }
});

module.exports = router;
