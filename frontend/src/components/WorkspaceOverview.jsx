import React, { useMemo } from 'react';
import { ArrowRight, CalendarClock, CheckCircle2, Circle, Clock3, Users } from 'lucide-react';
import AiCopilotPanel from './AiCopilotPanel';
import TeamHealthSummary from './TeamHealthSummary';
import ActivityTimeline from './ActivityTimeline';
import MilestonesPanel from './MilestonesPanel';

function getTaskDate(task) {
  return task.deadline || task.dueDate || task.due_date || null;
}

function formatDeadline(value) {
  if (!value) return 'No deadline';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

function getGreeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function Metric({ label, value, detail, icon: Icon, tone = 'default' }) {
  return (
    <div className={`human-metric human-metric--${tone}`}>
      <div className="human-metric__icon">{React.createElement(Icon, { className: 'h-4 w-4' })}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

export default function WorkspaceOverview({ currentTeam, session, tasks, members, milestones, onMilestoneCreated, onMilestoneUpdated, onMilestoneDeleted, activityEvents, onOpenBoard, onSelectTask }) {
  const today = useMemo(() => new Date(), []);
  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== 'done'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === 'done'), [tasks]);
  const dueToday = useMemo(() => tasks.filter((task) => {
    const value = getTaskDate(task);
    if (!value) return false;
    const date = new Date(value);
    return date.toDateString() === today.toDateString() && task.status !== 'done';
  }), [tasks, today]);
  const overdue = useMemo(() => activeTasks.filter((task) => {
    const value = getTaskDate(task);
    return value && new Date(value).getTime() < today.getTime();
  }), [activeTasks, today]);
  const nextTask = useMemo(() => [...activeTasks].sort((left, right) => {
    const leftDate = getTaskDate(left);
    const rightDate = getTaskDate(right);
    if (!leftDate && !rightDate) return 0;
    if (!leftDate) return 1;
    if (!rightDate) return -1;
    return new Date(leftDate) - new Date(rightDate);
  })[0], [activeTasks]);
  const name = session?.user?.user_metadata?.name?.split(' ')[0] || session?.user?.email?.split('@')[0] || 'there';
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(today);

  return (
    <div className="human-overview">
      <section className="human-welcome">
        <div>
          <p className="human-eyebrow">{dateLabel}</p>
          <h2>{getGreeting(today.getHours())}, {name}.</h2>
          <p className="human-welcome__copy">Here is what deserves your attention in {currentTeam?.name || 'your workspace'} today.</p>
        </div>
        <button type="button" className="human-secondary-button" onClick={onOpenBoard}>
          Open task board <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <div className="human-metrics">
        <Metric label="Open work" value={activeTasks.length} detail={overdue.length ? `${overdue.length} overdue` : 'No overdue work'} icon={Circle} tone={overdue.length ? 'alert' : 'default'} />
        <Metric label="Due today" value={dueToday.length} detail={dueToday.length ? 'Keep the promise' : 'Clear runway'} icon={CalendarClock} tone="warm" />
        <Metric label="Finished" value={completedTasks.length} detail="All-time on this team" icon={CheckCircle2} tone="green" />
        <Metric label="Team members" value={members.length} detail="People in this project" icon={Users} tone="blue" />
      </div>

      <div className="human-overview-grid">
        <section className="human-next-card">
          <div className="human-section-heading">
            <div>
              <p className="human-eyebrow">Recommended next</p>
              <h3>Make one meaningful move</h3>
            </div>
            <Clock3 className="h-5 w-5" />
          </div>
          {nextTask ? (
            <button type="button" className="human-next-task" onClick={() => { onSelectTask(nextTask.id); onOpenBoard(); }}>
              <span className="human-next-task__mark"><Circle className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <strong>{nextTask.title}</strong>
                <small>{nextTask.status === 'in progress' ? 'In progress' : 'Planned'} · {formatDeadline(getTaskDate(nextTask))}</small>
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="human-empty-state"><CheckCircle2 className="h-5 w-5" /><p>Your board is clear. Add the next concrete step when you are ready.</p></div>
          )}
          <div className="human-progress-line"><span style={{ width: `${tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%` }} /></div>
          <p className="human-progress-copy">{completedTasks.length} of {tasks.length} tasks completed</p>
        </section>

        <section className="human-pulse-card">
          <div className="human-section-heading">
            <div><p className="human-eyebrow">Team pulse</p><h3>Who is around</h3></div>
            <span className="human-live-dot">Live</span>
          </div>
          {members.length ? (
            <div className="human-people-list">
              {members.slice(0, 5).map((member) => (
                <div className="human-person" key={member.id}>
                  <span className="human-person__avatar">{member.avatar || member.name?.charAt(0) || '?'}</span>
                  <span><strong>{member.name || 'Team member'}</strong><small>{member.role === 'leader' ? 'Team lead' : 'Contributor'}</small></span>
                  <i />
                </div>
              ))}
            </div>
          ) : <div className="human-empty-state"><Users className="h-5 w-5" /><p>Your team members will appear here once they join.</p></div>}
        </section>
      </div>

      <TeamHealthSummary
        tasks={tasks}
        members={members}
        onOpenBoard={onOpenBoard}
        onSelectTask={onSelectTask}
      />

      <ActivityTimeline
        events={activityEvents}
        onOpenBoard={onOpenBoard}
        onSelectTask={onSelectTask}
      />

      <MilestonesPanel
        teamId={currentTeam?.id}
        milestones={milestones}
        tasks={tasks}
        onCreated={onMilestoneCreated}
        onUpdated={onMilestoneUpdated}
        onDeleted={onMilestoneDeleted}
      />

      <AiCopilotPanel teamId={currentTeam?.id} teamName={currentTeam?.name} />
    </div>
  );
}
