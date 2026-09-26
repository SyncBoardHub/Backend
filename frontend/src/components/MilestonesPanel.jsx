import React, { useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import { apiOrThrow } from '../lib/api';
import { useToast } from '../hooks/useToast';

function formatDate(value) {
  if (!value) return 'No deadline';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'No deadline';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function MilestoneCard({ milestone, onUpdated, onDeleted }) {
  const [saving, setSaving] = useState(false);
  const progress = milestone.totalTasks ? Math.round((milestone.completedTasks / milestone.totalTasks) * 100) : 0;

  const updateStatus = async (status) => {
    setSaving(true);
    try {
      const updated = await apiOrThrow(`/api/milestones/${milestone.id}`, 'PUT', { status });
      onUpdated(updated);
    } catch (error) {
      onUpdated(null, error.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete the milestone “${milestone.name}”?`)) return;
    setSaving(true);
    try {
      await apiOrThrow(`/api/milestones/${milestone.id}`, 'DELETE');
      onDeleted(milestone.id);
    } catch (error) {
      onUpdated(null, error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="milestone-card">
      <div className="milestone-card__topline">
        <div className="milestone-card__title"><span className="milestone-card__icon"><CalendarDays className="h-4 w-4" /></span><div><h4>{milestone.name}</h4><p>{milestone.description || 'Keep the next project outcome visible.'}</p></div></div>
        <button type="button" disabled={saving} onClick={remove} className="milestone-card__delete" aria-label={`Delete ${milestone.name}`}><Trash2 className="h-4 w-4" /></button>
      </div>
      <div className="milestone-card__meta"><span>{formatDate(milestone.dueDate)}</span><span>{milestone.completedTasks}/{milestone.totalTasks} tasks</span></div>
      <div className="milestone-card__progress"><i style={{ width: `${progress}%` }} /></div>
      <div className="milestone-card__footer">
        <span className={`milestone-card__status milestone-card__status--${milestone.status.replace(' ', '-')}`}>
          {milestone.status === 'completed' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
          {milestone.status === 'in progress' ? 'In progress' : milestone.status === 'completed' ? 'Completed' : 'Planned'}
        </span>
        <select value={milestone.status} disabled={saving} onChange={(event) => updateStatus(event.target.value)} aria-label={`Update ${milestone.name} status`}>
          <option value="planned">Planned</option>
          <option value="in progress">In progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    </article>
  );
}

export default function MilestonesPanel({ teamId, milestones, tasks, onCreated, onUpdated, onDeleted }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const createMilestone = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const milestone = await apiOrThrow('/api/milestones', 'POST', { teamId, name, description, dueDate: dueDate || null });
      onCreated(milestone);
      setName('');
      setDescription('');
      setDueDate('');
      setShowForm(false);
      showToast({ title: 'Milestone created', message: `${milestone.name} is ready for tasks.`, variant: 'success' });
    } catch (error) {
      showToast({ title: 'Could not create milestone', message: error.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdated = (milestone, errorMessage) => {
    if (milestone) onUpdated(milestone);
    if (errorMessage) showToast({ title: 'Milestone update failed', message: errorMessage, variant: 'error' });
  };

  const visibleMilestones = milestones.map((milestone) => {
    const linkedTasks = tasks.filter((task) => task.milestoneId === milestone.id);
    return {
      ...milestone,
      totalTasks: linkedTasks.length,
      completedTasks: linkedTasks.filter((task) => task.status === 'done').length
    };
  });

  return (
    <section className="milestones-panel" aria-labelledby="milestones-title">
      <div className="milestones-panel__header">
        <div><p className="human-eyebrow">Submission planning</p><h3 id="milestones-title">Project milestones</h3><p>Break the assignment into outcomes your group can actually finish.</p></div>
        <button type="button" className="human-secondary-button" onClick={() => setShowForm((value) => !value)}><Plus className="h-4 w-4" /> Add milestone</button>
      </div>

      {showForm ? (
        <form className="milestone-form" onSubmit={createMilestone}>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Research complete" required maxLength={120} autoFocus />
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What should be true when this is complete?" maxLength={240} />
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} aria-label="Milestone deadline" />
          <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save milestone'}</button>
        </form>
      ) : null}

      {visibleMilestones.length ? (
        <div className="milestones-panel__grid">
          {visibleMilestones.map((milestone) => <MilestoneCard key={milestone.id} milestone={milestone} onUpdated={handleUpdated} onDeleted={onDeleted} />)}
        </div>
      ) : (
        <div className="milestones-panel__empty"><CalendarDays className="h-5 w-5" /><span>Create milestones for research, implementation, testing, and final submission.</span></div>
      )}
    </section>
  );
}
