'use strict';

const STORAGE_BUCKET = 'team-files';

const TASK_STATUSES = Object.freeze(['planned', 'in progress', 'done']);
const MILESTONE_STATUSES = Object.freeze(['planned', 'in progress', 'completed']);
const TIMER_ACTIONS = Object.freeze(['start', 'stop', 'complete']);
const JOIN_REQUEST_STATUSES = Object.freeze(['pending', 'approved', 'rejected']);

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 12;

const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  assignments: true,
  deadlines: true,
  mentions: true,
  activity: false,
  emailEnabled: true
});

const NOTIFICATION_PREFERENCE_KEYS = Object.freeze({
  task_assigned: 'assignments',
  deadline_reminder: 'deadlines',
  team_joined: 'activity',
  team_join_requested: 'activity',
  team_join_approved: 'activity',
  team_join_rejected: 'activity',
  team_member_removed: 'activity',
  mention: 'mentions'
});

const SOCKET_EVENTS = Object.freeze({
  // Team
  TEAM_CREATED: 'team:created',
  TEAM_UPDATED: 'team:updated',
  TEAM_DELETED: 'team:deleted',
  TEAM_MEMBER_ONLINE: 'team:member_online',
  TEAM_MEMBER_OFFLINE: 'team:member_offline',
  TEAM_ONLINE_LIST: 'team:online_list',
  TEAM_ERROR: 'team:error',

  // Tasks
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',

  // Notes
  NOTE_CREATED: 'note:created',
  NOTE_UPDATED: 'note:updated',
  NOTE_DELETED: 'note:deleted',
  NOTE_TYPING: 'note:typing',

  // Files
  FILE_UPLOADED: 'file:uploaded',
  FILE_DELETED: 'file:deleted',

  // Milestones
  MILESTONE_CREATED: 'milestone:created',
  MILESTONE_UPDATED: 'milestone:updated',
  MILESTONE_DELETED: 'milestone:deleted',

  // Activity
  ACTIVITY_CREATED: 'activity:created',

  // Diagrams
  DIAGRAM_SAVED: 'diagram:saved',
  DIAGRAM_DELETED: 'diagram:deleted',

  // Notifications
  NOTIFICATION_NEW: 'notification:new',

  // Socket join/leave
  JOIN_TEAM: 'join:team',
  LEAVE_TEAM: 'leave:team'
});

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const BLOCKED_EXTENSIONS = Object.freeze(['.exe', '.bat', '.cmd', '.sh', '.msi', '.com', '.scr']);

const MAX_DAILY_EMAILS = 100;

module.exports = {
  STORAGE_BUCKET,
  TASK_STATUSES,
  MILESTONE_STATUSES,
  TIMER_ACTIONS,
  JOIN_REQUEST_STATUSES,
  INVITE_ALPHABET,
  INVITE_CODE_LENGTH,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFERENCE_KEYS,
  SOCKET_EVENTS,
  MAX_FILE_SIZE_BYTES,
  BLOCKED_EXTENSIONS,
  MAX_DAILY_EMAILS
};
