import React from 'react';
import { ArrowRight, CheckCircle2, FileText, ListChecks, MessageSquare, UserRound } from 'lucide-react';

const entityIcons = {
  task: ListChecks,
  note: MessageSquare,
  file: FileText,
  team: UserRound
};

function formatActivity(event) {
  const title = event.metadata?.title || event.metadata?.name || 'an item';
  const actionLabels = {
    created: 'created',
    updated: 'updated',
    status_changed: 'moved',
    completed: 'completed',
    uploaded: 'uploaded',
    deleted: 'removed'
  };
  return `${actionLabels[event.action] || event.action} ${title}`;
}

function formatTime(value) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

export default function ActivityTimeline({ events, onOpenBoard, onSelectTask }) {
  return (
    <section className="activity-timeline" aria-labelledby="activity-title">
      <div className="activity-timeline__header">
        <div>
          <p className="human-eyebrow">Project history</p>
          <h3 id="activity-title">What changed recently</h3>
        </div>
        <button type="button" onClick={onOpenBoard}>View board <ArrowRight className="h-3.5 w-3.5" /></button>
      </div>

      {events.length ? (
        <div className="activity-timeline__list">
          {events.slice(0, 8).map((event) => {
            const Icon = entityIcons[event.entityType] || ListChecks;
            const canOpenTask = event.entityType === 'task' && event.entityId;
            return (
              <button
                type="button"
                key={event.id}
                className={`activity-timeline__event ${canOpenTask ? 'is-clickable' : ''}`}
                onClick={() => {
                  if (canOpenTask) {
                    onSelectTask(event.entityId);
                    onOpenBoard();
                  }
                }}
                disabled={!canOpenTask}
              >
                <span className="activity-timeline__icon"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1 text-left">
                  <strong><b>{event.actorName || 'Team member'}</b> {formatActivity(event)}</strong>
                  <small>{formatTime(event.createdAt)}</small>
                </span>
                {canOpenTask ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="activity-timeline__empty"><CheckCircle2 className="h-5 w-5" /><span>Project activity will appear here as your team starts working.</span></div>
      )}
    </section>
  );
}
