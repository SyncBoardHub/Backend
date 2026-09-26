import React, { useMemo } from 'react';
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Circle, UserRound } from 'lucide-react';

function getTaskDate(task) {
  return task.deadline || task.dueDate || task.due_date || null;
}

function getDateValue(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

function formatDate(value) {
  const date = getDateValue(value);
  if (!date || Number.isNaN(date.getTime())) return 'No deadline';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function HealthStat({ label, value, detail, tone = 'default' }) {
  return (
    <div className={`team-health-stat team-health-stat--${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{detail}</small>
    </div>
  );
}

export default function TeamHealthSummary({ tasks, members, onOpenBoard, onSelectTask }) {
  const today = useMemo(() => new Date(), []);
  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== 'done'), [tasks]);
  const overdueTasks = useMemo(() => activeTasks.filter((task) => {
    const date = getDateValue(getTaskDate(task));
    return date && date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }), [activeTasks, today]);
  const dueSoonTasks = useMemo(() => activeTasks.filter((task) => {
    const date = getDateValue(getTaskDate(task));
    if (!date) return false;
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
    return date >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) && date <= end;
  }), [activeTasks, today]);
  const unassignedTasks = useMemo(() => activeTasks.filter((task) => !task.assigneeId && !task.assignee_id), [activeTasks]);
  const workload = useMemo(() => members.map((member) => {
    const memberTasks = tasks.filter((task) => (task.assigneeId || task.assignee_id) === member.id);
    const active = memberTasks.filter((task) => task.status !== 'done').length;
    const completed = memberTasks.filter((task) => task.status === 'done').length;
    return { ...member, active, completed, total: memberTasks.length };
  }).sort((left, right) => right.active - left.active), [members, tasks]);

  const riskTasks = [...overdueTasks, ...dueSoonTasks.filter((task) => !overdueTasks.some((item) => item.id === task.id))].slice(0, 4);
  const projectStatus = overdueTasks.length || unassignedTasks.length ? 'Needs attention' : activeTasks.length ? 'On track' : 'Ready for planning';
  const statusTone = overdueTasks.length || unassignedTasks.length ? 'alert' : 'healthy';

  return (
    <section className="team-health" aria-labelledby="team-health-title">
      <div className="team-health__header">
        <div>
          <p className="human-eyebrow">Project health</p>
          <h3 id="team-health-title">A clear read on the work</h3>
          <p>See what could slow the team down before the deadline gets close.</p>
        </div>
        <span className={`team-health__status team-health__status--${statusTone}`}>
          {statusTone === 'healthy' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {projectStatus}
        </span>
      </div>

      <div className="team-health__stats">
        <HealthStat label="Overdue" value={overdueTasks.length} detail={overdueTasks.length ? 'Needs an owner today' : 'Nothing late'} tone={overdueTasks.length ? 'alert' : 'healthy'} />
        <HealthStat label="Due this week" value={dueSoonTasks.length} detail={dueSoonTasks.length ? 'Keep these visible' : 'No close deadlines'} tone="warm" />
        <HealthStat label="Unassigned" value={unassignedTasks.length} detail={unassignedTasks.length ? 'Choose an owner' : 'Everyone has a lane'} tone={unassignedTasks.length ? 'alert' : 'default'} />
      </div>

      <div className="team-health__grid">
        <div>
          <div className="team-health__subheading"><span>Attention needed</span><button type="button" onClick={onOpenBoard}>Open board <ArrowRight className="h-3.5 w-3.5" /></button></div>
          {riskTasks.length ? (
            <div className="team-health__risk-list">
              {riskTasks.map((task) => (
                <button type="button" key={task.id} className="team-health__risk" onClick={() => { onSelectTask(task.id); onOpenBoard(); }}>
                  <span className={`team-health__risk-icon ${overdueTasks.some((item) => item.id === task.id) ? 'is-alert' : ''}`}>
                    {overdueTasks.some((item) => item.id === task.id) ? <AlertTriangle className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1 text-left"><strong>{task.title}</strong><small>{overdueTasks.some((item) => item.id === task.id) ? 'Overdue' : `Due ${formatDate(getTaskDate(task))}`}</small></span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ))}
            </div>
          ) : (
            <div className="team-health__empty"><CheckCircle2 className="h-5 w-5" /><span>No urgent work is waiting for attention.</span></div>
          )}
        </div>

        <div>
          <div className="team-health__subheading"><span>Workload</span><UserRound className="h-4 w-4" /></div>
          {workload.length ? (
            <div className="team-health__workload">
              {workload.slice(0, 5).map((member) => (
                <div className="team-health__person" key={member.id}>
                  <span className="team-health__avatar">{member.avatar || member.name?.charAt(0) || '?'}</span>
                  <span className="min-w-0 flex-1"><strong>{member.name || 'Team member'}</strong><small>{member.active} active · {member.completed} complete</small></span>
                  <span className="team-health__bar"><i style={{ width: `${member.total ? Math.round((member.completed / member.total) * 100) : 0}%` }} /></span>
                </div>
              ))}
            </div>
          ) : (
            <div className="team-health__empty"><Circle className="h-5 w-5" /><span>Assign the first task to make workload visible.</span></div>
          )}
        </div>
      </div>
    </section>
  );
}
