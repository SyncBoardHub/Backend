import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  MoreVertical,
  Play,
  Plus,
  Square,
  Star,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import { api, apiOrThrow } from '../../lib/api';
import socket from '../../lib/socket';
import { useToast } from '../../hooks/useToast';
import AssigneeSelect from './AssigneeSelect';

function getUrgency(deadline) {
  if (!deadline) return { level: 'none', label: '', color: '' };
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms < 0) return { level: 'missed', label: 'Missed', color: 'red' };
  if (ms < 4 * 3600000) return { level: 'critical', label: 'Critical', color: 'red' };
  if (ms < 24 * 3600000) return { level: 'warning', label: 'Warning', color: 'yellow' };
  return { level: 'safe', label: 'Safe', color: 'green' };
}

function formatCountdown(deadline) {
  if (!deadline) return '';
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms < 0) return 'Overdue';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const URGENCY_BORDER = {
  missed: 'border-red-500/50 shadow-red-500/10 shadow-lg',
  critical: 'border-red-400/40 shadow-red-400/5 shadow-md',
  warning: 'border-yellow-400/30',
  safe: 'border-emerald-400/20',
  none: 'border-white/5',
};

const URGENCY_BADGE = {
  missed: 'bg-red-500/20 text-red-400',
  critical: 'bg-red-500/15 text-red-400',
  warning: 'bg-yellow-500/15 text-yellow-400',
  safe: 'bg-emerald-500/15 text-emerald-400',
  none: 'bg-white/5 text-gray-500',
};

const STATUS_COLS = [
  { key: 'planned', label: 'Planned', icon: 'PL', accent: 'blue' },
  { key: 'in progress', label: 'In Progress', icon: 'IP', accent: 'yellow' },
  { key: 'done', label: 'Done', icon: 'DN', accent: 'green' },
  { key: 'missed', label: 'Missed', icon: 'MS', accent: 'red' },
];

function TaskCard({
  task,
  members,
  milestones,
  onUpdate,
  onDelete,
  onTimer,
  isNextBest,
  isSelected,
  onSelectTask,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [liveMinutes, setLiveMinutes] = useState(task.actualTime || 0);
  const assignee = members.find((member) => member.id === task.assigneeId);
  const milestone = milestones.find((item) => item.id === task.milestoneId);
  const urgency = getUrgency(task.deadline);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!task.deadline || task.status === 'done') return undefined;
    const tick = () => setCountdown(formatCountdown(task.deadline));
    tick();
    const intervalId = window.setInterval(tick, 30000);
    return () => window.clearInterval(intervalId);
  }, [task.deadline, task.status]);

  useEffect(() => {
    const updateMinutes = () => {
      if (task.timerRunning && task.timerStart) {
        const elapsed = Math.floor((Date.now() - Number(task.timerStart)) / 60000);
        setLiveMinutes((task.actualTime || 0) + elapsed);
      } else {
        setLiveMinutes(task.actualTime || 0);
      }
    };

    updateMinutes();
    if (!task.timerRunning) return undefined;

    const intervalId = window.setInterval(updateMinutes, 30000);
    return () => window.clearInterval(intervalId);
  }, [task.actualTime, task.timerRunning, task.timerStart]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Compute workTime from already-tracked state (no Date.now in render)
  const workTime = task.timerRunning
    ? (liveMinutes > 0 ? `${liveMinutes}m` : null)
    : (task.actualTime ? `${task.actualTime}m` : null);

  return (
    <div
      onClick={() => onSelectTask?.(task.id)}
      className={`task-card group relative cursor-pointer rounded-2xl border bg-white/[0.03] p-4 transition hover:bg-white/[0.06] ${URGENCY_BORDER[urgency.level]} ${
        isNextBest ? 'ring-2 ring-purple-500/40' : ''
      } ${isSelected ? 'ring-2 ring-blue-400/40' : ''}`}
    >
      {isNextBest ? (
        <div className="absolute -right-2 -top-2 flex items-center gap-1 rounded-full bg-purple-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-lg">
          <Star className="h-3 w-3" />
          NEXT
        </div>
      ) : null}

      <div className="mb-2 flex items-start justify-between">
        <div className="min-w-0 pr-6">
          <h4 className="task-card__title text-sm font-semibold leading-tight text-white">{task.title}</h4>
          {milestone ? <p className="task-card__milestone mt-1 truncate text-[10px] text-purple-300">{milestone.name}</p> : null}
        </div>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setShowMenu((prev) => !prev);
            }}
            className="cursor-pointer p-0.5 text-gray-400 opacity-0 transition hover:text-white group-hover:opacity-100"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          <AnimatePresence>
            {showMenu ? (
              <div
                className="absolute right-0 top-6 z-20 min-w-[160px] rounded-xl border border-white/10 bg-[#1a1625] p-1.5 shadow-xl"
              >
                {task.status !== 'done' ? (
                  <React.Fragment>
                    {task.status === 'planned' || task.status === 'missed' ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onUpdate(task.id, { status: 'in progress' });
                          setShowMenu(false);
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-xs text-gray-300 transition hover:bg-white/10"
                      >
                        Start
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onUpdate(task.id, { status: 'done' });
                        setShowMenu(false);
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-xs text-emerald-300 transition hover:bg-emerald-500/10"
                    >
                      Mark Done
                    </button>
                  </React.Fragment>
                ) : null}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(task.id);
                    setShowMenu(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs text-red-300 transition hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {task.description ? <p className="task-card__description mb-3 line-clamp-2 text-xs text-gray-400">{task.description}</p> : null}

      <div className="flex flex-wrap items-center gap-1.5">
        {assignee ? (
          <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[10px] font-medium text-gray-400">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-[8px] font-bold text-white">
              {assignee.avatar || assignee.name?.charAt(0)}
            </span>
            {assignee.name?.split(' ')[0]}
          </span>
        ) : null}
        {countdown && task.status !== 'done' ? (
          <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${URGENCY_BADGE[urgency.level]}`}>
            {urgency.level === 'critical' || urgency.level === 'missed' ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {countdown}
          </span>
        ) : null}
        {task.deadline && task.status === 'done' ? (
          <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[10px] text-gray-500">
            <Calendar className="h-3 w-3" />
            {new Date(task.deadline).toLocaleDateString()}
          </span>
        ) : null}
        {workTime ? (
          <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${task.timerRunning ? 'animate-pulse bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-500'}`}>
            <Timer className="h-3 w-3" />
            {workTime}
          </span>
        ) : null}
      </div>

      {task.status !== 'done' ? (
        <div className="mt-3 flex gap-1.5 border-t border-white/5 pt-3">
          {!task.timerRunning ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onTimer(task.id, 'start');
              }}
              className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-green-400 transition hover:bg-green-500/10"
            >
              <Play className="h-3 w-3" />
              Start
            </button>
          ) : (
            <React.Fragment>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onTimer(task.id, 'stop');
                }}
                className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-yellow-400 transition hover:bg-yellow-500/10"
              >
                <Square className="h-3 w-3" />
                Pause
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onTimer(task.id, 'complete');
                }}
                className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-green-400 transition hover:bg-green-500/10"
              >
                <CheckCircle className="h-3 w-3" />
                Done
              </button>
            </React.Fragment>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function TaskBoard({ teamId, session, selectedTaskId, milestones = [], onSelectTask, onTasksChange }) {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', assigneeId: '', deadline: '', milestoneId: '' });
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchTasks = useCallback(async () => {
    if (!teamId) return;
    const data = await api(`/api/tasks?teamId=${teamId}`);
    if (data && Array.isArray(data)) {
      setTasks(data);
    }
    setLoading(false);
  }, [teamId]);

  const fetchMembers = useCallback(async () => {
    if (!teamId) return;
    const data = await api(`/api/teams/${teamId}/members`);
    if (data && Array.isArray(data)) {
      const seen = new Set();
      setMembers(data.filter((member) => {
        if (seen.has(member.id)) return false;
        seen.add(member.id);
        return true;
      }));
    }
  }, [teamId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchTasks();
      fetchMembers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchTasks, fetchMembers]);

  useEffect(() => {
    onTasksChange?.(tasks);
  }, [tasks, onTasksChange]);

  useEffect(() => {
    const handleCreated = (task) => {
      if (task.teamId === teamId) {
        setTasks((prev) => {
          const withoutDuplicate = prev.filter((item) => item.id !== task.id);
          return [task, ...withoutDuplicate];
        });
      }
    };

    const handleUpdated = (task) => {
      if (task.teamId === teamId) {
        setTasks((prev) => prev.map((item) => (item.id === task.id ? task : item)));
      }
    };

    const handleDeleted = (id) => {
      setTasks((prev) => prev.filter((item) => item.id !== id));
    };

    socket.on('task:created', handleCreated);
    socket.on('task:updated', handleUpdated);
    socket.on('task:deleted', handleDeleted);

    return () => {
      socket.off('task:created', handleCreated);
      socket.off('task:updated', handleUpdated);
      socket.off('task:deleted', handleDeleted);
    };
  }, [teamId]);

  const createTask = async (event) => {
    event.preventDefault();

    try {
      const deadlineISO = newTask.deadline ? new Date(newTask.deadline).toISOString() : null;
      const createdTask = await apiOrThrow('/api/tasks', 'POST', {
        title: newTask.title,
        description: newTask.description,
        teamId,
        assigneeId: newTask.assigneeId || session?.user?.id,
        deadline: deadlineISO,
        milestoneId: newTask.milestoneId || null,
      });

      setTasks((prev) => [createdTask, ...prev.filter((task) => task.id !== createdTask.id)]);
      setNewTask({ title: '', description: '', assigneeId: '', deadline: '', milestoneId: '' });
      setShowCreate(false);
      showToast({
        title: 'Task created',
        message: `${createdTask.title} is now on the board.`,
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Could not create task',
        message: error.message,
        variant: 'error',
      });
    }
  };

  const updateTask = async (id, updates) => {
    const previousTasks = tasks;
    const optimisticTasks = tasks.map((task) => (task.id === id ? { ...task, ...updates } : task));
    setTasks(optimisticTasks);

    try {
      const updatedTask = await apiOrThrow(`/api/tasks/${id}`, 'PUT', updates);
      setTasks((prev) => prev.map((task) => (task.id === id ? updatedTask : task)));
      if (updates.assigneeId) {
        const assignee = members.find((member) => member.id === updates.assigneeId);
        showToast({
          title: 'Assignment updated',
          message: assignee ? `${assignee.name} is now assigned.` : 'Task assignee updated.',
          variant: 'success',
        });
      }
    } catch (error) {
      setTasks(previousTasks);
      showToast({
        title: 'Task update failed',
        message: error.message,
        variant: 'error',
      });
    }
  };

  const deleteTask = async (id) => {
    const previousTasks = tasks;
    setTasks((prev) => prev.filter((task) => task.id !== id));

    try {
      await apiOrThrow(`/api/tasks/${id}`, 'DELETE');
      showToast({
        title: 'Task deleted',
        message: 'The task was removed from the board.',
        variant: 'success',
      });
    } catch (error) {
      setTasks(previousTasks);
      showToast({
        title: 'Could not delete task',
        message: error.message,
        variant: 'error',
      });
    }
  };

  const timerAction = async (id, action) => {
    try {
      const updatedTask = await apiOrThrow(`/api/tasks/${id}/timer`, 'POST', { action });
      setTasks((prev) => prev.map((task) => (task.id === id ? updatedTask : task)));
    } catch (error) {
      showToast({
        title: 'Timer action failed',
        message: error.message,
        variant: 'error',
      });
    }
  };

  const sorted = useMemo(
    () => [...tasks].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
    [tasks],
  );

  // Keep a stable "now" that refreshes every minute so missed-deadline detection stays current
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const getEffectiveStatus = useCallback((task) => {
    if (task.status === 'done') return 'done';
    if (task.deadline) {
      const deadlineMs = new Date(task.deadline).getTime();
      if (!Number.isNaN(deadlineMs) && deadlineMs < now) {
        return 'missed';
      }
    }
    return task.status;
  }, [now]);

  const activeTasks = sorted.filter((task) => !['done', 'missed'].includes(getEffectiveStatus(task)));
  const tasksWithDeadline = activeTasks.filter((task) => task.deadline);
  const nextBestId = tasksWithDeadline.length > 0
    ? [...tasksWithDeadline].sort((left, right) => new Date(left.deadline) - new Date(right.deadline))[0].id
    : activeTasks[0]?.id;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="task-board space-y-4">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="task-board__new-button flex cursor-pointer items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-500"
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {STATUS_COLS.map((column) => {
          const columnTasks = sorted.filter((task) => getEffectiveStatus(task) === column.key);
          return (
            <div key={column.key} className="task-column space-y-3">
              <div className="task-column__header mb-1 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-gray-300">
                  {column.icon}
                </span>
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-300">{column.label}</h4>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-500">{columnTasks.length}</span>
              </div>

              <div className="max-h-[60vh] min-h-[100px] space-y-3 overflow-y-auto pr-1">
                <AnimatePresence>
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      members={members}
                      milestones={milestones}
                      onUpdate={updateTask}
                      onDelete={deleteTask}
                      onTimer={timerAction}
                      isNextBest={task.id === nextBestId}
                      isSelected={task.id === selectedTaskId}
                      onSelectTask={onSelectTask}
                    />
                  ))}
                </AnimatePresence>
                {columnTasks.length === 0 ? (
                  <div className="task-column__empty rounded-2xl border border-dashed border-white/5 py-8 text-center text-xs text-gray-600">
                    Nothing here yet
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {showCreate ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setShowCreate(false)}
          >
            <div
              className="glass-panel w-full max-w-lg rounded-3xl p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">New Task</h3>
                <button type="button" onClick={() => setShowCreate(false)} className="cursor-pointer text-gray-400 transition hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={createTask} className="space-y-4">
                <input
                  type="text"
                  placeholder="Task title"
                  value={newTask.title}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newTask.description}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, description: event.target.value }))}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <AssigneeSelect
                  members={members}
                  value={newTask.assigneeId}
                  onChange={(assigneeId) => setNewTask((prev) => ({ ...prev, assigneeId }))}
                  currentUserId={session?.user?.id}
                />
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Deadline</label>
                  <input
                    type="datetime-local"
                    value={newTask.deadline}
                    onChange={(event) => setNewTask((prev) => ({ ...prev, deadline: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Milestone</label>
                  <select
                    value={newTask.milestoneId}
                    onChange={(event) => setNewTask((prev) => ({ ...prev, milestoneId: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 [color-scheme:dark]"
                  >
                    <option value="">No milestone</option>
                    {milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.name}</option>)}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-3 font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:from-purple-500 hover:to-blue-500"
                >
                  Create Task
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
