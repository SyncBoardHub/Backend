import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Crown, Home, LogOut, LayoutDashboard, FileText, FolderOpen, Code2, BarChart3, PenTool } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import socket from '../lib/socket';

import NotificationsDropdown from '../components/NotificationsDropdown';
import ProfileMenu from '../components/ProfileMenu';
import SearchBar from '../components/SearchBar';
import UserProfile from '../components/UserProfile';
import { api, apiOrThrow } from '../lib/api';
import TeamPanel from '../features/team/TeamPanel';
import WorkspaceOverview from '../components/WorkspaceOverview';

const FilesPanel = lazy(() => import('../components/FilesPanel'));
const NotesPanel = lazy(() => import('../components/NotesPanel'));
const GitHubPanel = lazy(() => import('../components/GitHubPanel'));
const AnalyticsPanel = lazy(() => import('../components/AnalyticsPanel'));
const QuickAddTask = lazy(() => import('../components/QuickAddTask'));
const WhiteboardPanel = lazy(() => import('../components/WhiteboardPanel'));
const TaskBoard = lazy(() => import('../features/tasks/TaskBoard'));

export default function DashboardPage({ session }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentTeam, setCurrentTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [profileUserId, setProfileUserId] = useState(null);
  const [teamTasks, setTeamTasks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [activityEvents, setActivityEvents] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamLoadError, setTeamLoadError] = useState('');
  const currentUserId = session?.user?.id;
  const navigate = useNavigate();

  const handleTeamChange = useCallback((team) => {
    setMembers([]);
    setOnlineUsers([]);
    setTeamTasks([]);
    setMilestones([]);
    setActivityEvents([]);
    setSelectedTaskId(null);
    setTeamLoadError('');
    setCurrentTeam(team);
  }, []);

  useEffect(() => {
    if (!currentTeam || !session?.access_token) return undefined;

    let active = true;
    setTeamLoading(true);
    setTeamLoadError('');

    Promise.all([
      apiOrThrow(`/api/teams/${currentTeam.id}/members`),
      apiOrThrow(`/api/tasks?teamId=${currentTeam.id}`)
    ]).then(([memberData, taskData]) => {
      if (!active) return;
      if (Array.isArray(memberData)) {
        const seen = new Set();
        setMembers(memberData.filter((member) => {
          if (seen.has(member.id)) return false;
          seen.add(member.id);
          return true;
        }));
      }
      if (Array.isArray(taskData)) setTeamTasks(taskData);
    }).catch((error) => {
      if (active) setTeamLoadError(error.message || 'Unable to load this workspace.');
    }).finally(() => {
      if (active) setTeamLoading(false);
    });

    apiOrThrow(`/api/activity?teamId=${currentTeam.id}&limit=25`)
      .then((events) => {
        if (active && Array.isArray(events)) setActivityEvents(events);
      })
      .catch(() => {
        if (active) setActivityEvents([]);
      });

    apiOrThrow(`/api/milestones?teamId=${currentTeam.id}`)
      .then((items) => {
        if (active && Array.isArray(items)) setMilestones(items);
      })
      .catch(() => {
        if (active) setMilestones([]);
      });

    socket.auth = { token: session?.access_token };
    if (!socket.connected) socket.connect();
    socket.emit('join:team', { teamId: currentTeam.id, userId: currentUserId });

    const handleOnline = ({ userId }) => setOnlineUsers((prev) => [...new Set([...prev, userId])]);
    const handleOffline = ({ userId }) => setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    const handleOnlineList = (list) => setOnlineUsers(list);
    const handleTaskCreated = (task) => {
      if (task.teamId === currentTeam.id) {
        setTeamTasks((prev) => [task, ...prev.filter((item) => item.id !== task.id)]);
      }
    };
    const handleTaskUpdated = (task) => {
      if (task.teamId === currentTeam.id) {
        setTeamTasks((prev) => prev.map((item) => (item.id === task.id ? task : item)));
      }
    };
    const handleTaskDeleted = (taskId) => {
      setTeamTasks((prev) => prev.filter((task) => task.id !== taskId));
    };
    const handleActivityCreated = (event) => {
      if (event.teamId === currentTeam.id) {
        setActivityEvents((prev) => [event, ...prev.filter((item) => item.id !== event.id)].slice(0, 25));
      }
    };
    const handleMilestoneCreated = (milestone) => {
      if (milestone.teamId === currentTeam.id) setMilestones((prev) => [milestone, ...prev.filter((item) => item.id !== milestone.id)]);
    };
    const handleMilestoneUpdated = (milestone) => {
      if (milestone.teamId === currentTeam.id) setMilestones((prev) => prev.map((item) => (item.id === milestone.id ? milestone : item)));
    };
    const handleMilestoneDeleted = (milestoneId) => {
      setMilestones((prev) => prev.filter((item) => item.id !== milestoneId));
    };
    const handleSocketError = () => {
      if (active) setTeamLoadError('Live updates are unavailable. Your changes will still be saved when the connection returns.');
    };

    socket.on('team:member_online', handleOnline);
    socket.on('team:member_offline', handleOffline);
    socket.on('team:online_list', handleOnlineList);
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('activity:created', handleActivityCreated);
    socket.on('milestone:created', handleMilestoneCreated);
    socket.on('milestone:updated', handleMilestoneUpdated);
    socket.on('milestone:deleted', handleMilestoneDeleted);
    socket.on('connect_error', handleSocketError);

    return () => {
      active = false;
      socket.emit('leave:team', currentTeam.id);
      socket.off('team:member_online', handleOnline);
      socket.off('team:member_offline', handleOffline);
      socket.off('team:online_list', handleOnlineList);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('activity:created', handleActivityCreated);
      socket.off('milestone:created', handleMilestoneCreated);
      socket.off('milestone:updated', handleMilestoneUpdated);
      socket.off('milestone:deleted', handleMilestoneDeleted);
      socket.off('connect_error', handleSocketError);
    };
  }, [currentTeam, currentUserId, session?.access_token]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isLeader = currentTeam?.ownerId === currentUserId;

  const handleTasksSync = useCallback((tasks) => {
    setTeamTasks(tasks);
  }, []);

  const resolvedSelectedTaskId = useMemo(() => {
    if (selectedTaskId && teamTasks.some((task) => task.id === selectedTaskId)) {
      return selectedTaskId;
    }

    return teamTasks.find((task) => task.status !== 'done')?.id || null;
  }, [teamTasks, selectedTaskId]);

  const navItems = [
    { icon: Home, label: 'Today', key: 'overview' },
    { icon: LayoutDashboard, label: 'Board', key: 'board' },
    { icon: FileText, label: 'Notes', key: 'notes' },
    { icon: FolderOpen, label: 'Files', key: 'files' },
    { icon: PenTool, label: 'Whiteboard', key: 'whiteboard' },
    { icon: Code2, label: 'GitHub', key: 'github' },
    { icon: BarChart3, label: 'Analytics', key: 'analytics' },
  ];

  const tabTitles = {
    overview: 'Today',
    board: 'Task Board',
    notes: 'Notes',
    files: 'Files',
    whiteboard: 'Whiteboard',
    github: 'GitHub',
    analytics: 'Analytics',
  };

  const content = !currentTeam ? (
    <div className="flex h-[60vh] flex-col items-center justify-center">
      <div className="mb-6 text-6xl">Team</div>
      <h2 className="mb-2 text-2xl font-bold">Create or join a team</h2>
      <p className="max-w-md text-center text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>
        Your team tools are always visible in the left panel. Pick a team there to open the shared workspace.
      </p>
    </div>
  ) : (
    <div>
      {activeTab === 'overview' && (
        <WorkspaceOverview
          currentTeam={currentTeam}
          session={session}
          tasks={teamTasks}
          members={members}
          milestones={milestones}
          onMilestoneCreated={(milestone) => setMilestones((prev) => [milestone, ...prev.filter((item) => item.id !== milestone.id)])}
          onMilestoneUpdated={(milestone) => setMilestones((prev) => prev.map((item) => (item.id === milestone.id ? milestone : item)))}
          onMilestoneDeleted={(milestoneId) => setMilestones((prev) => prev.filter((item) => item.id !== milestoneId))}
          activityEvents={activityEvents}
          onOpenBoard={() => setActiveTab('board')}
          onSelectTask={setSelectedTaskId}
        />
      )}
      {activeTab === 'board' && (
        <TaskBoard
          teamId={currentTeam.id}
          session={session}
          selectedTaskId={resolvedSelectedTaskId}
          milestones={milestones}
          onSelectTask={setSelectedTaskId}
          onTasksChange={handleTasksSync}
        />
      )}
      {activeTab === 'notes' && <NotesPanel teamId={currentTeam.id} />}
      {activeTab === 'files' && <FilesPanel teamId={currentTeam.id} />}
      {activeTab === 'whiteboard' && <WhiteboardPanel teamId={currentTeam.id} />}
      {activeTab === 'github' && (
        <GitHubPanel
          teamId={currentTeam.id}
          currentTeam={currentTeam}
          isLeader={isLeader}
          onTeamUpdate={() => {
            api('/api/teams').then((teams) => {
              if (teams && Array.isArray(teams)) {
                const updatedTeam = teams.find((team) => team.id === currentTeam.id);
                if (updatedTeam) setCurrentTeam(updatedTeam);
              }
            });
          }}
        />
      )}
      {activeTab === 'analytics' && <AnalyticsPanel teamId={currentTeam.id} />}
    </div>
  );

  return (
    <div className="human-dashboard relative h-screen overflow-hidden font-sans" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="flex h-full overflow-hidden">
        <nav
          className="glass-panel z-10 m-3 flex w-20 flex-shrink-0 flex-col justify-between rounded-3xl px-3 py-5 lg:w-72 lg:px-4"
        >
          <div className="space-y-4 overflow-y-auto">
            <div className="flex items-center justify-center gap-3 px-1 lg:justify-start">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="brand-mark"
                title="Go to Today"
              >
                S
              </button>
              <button type="button" onClick={() => setActiveTab('overview')} className="hidden lg:block">
                <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  SyncBoard
                </h2>
              </button>
            </div>

            <div className="hidden lg:block">
              <TeamPanel currentTeam={currentTeam} onTeamChange={handleTeamChange} session={session} />
            </div>

            {currentTeam && members.length > 0 ? (
              <div className="hidden lg:block">
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Team ({onlineUsers.length} online)
                </p>
                <div className="flex flex-wrap gap-1.5 px-1">
                  {members.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className="group relative"
                      title={`${member.name}${member.role === 'leader' ? ' (Owner)' : ''}`}
                      onClick={() => setProfileUserId(member.id)}
                    >
                      <div
                        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 text-xs font-bold transition-all hover:scale-110 ${
                          onlineUsers.includes(member.id)
                            ? 'border-green-400 bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                            : 'border-white/10 text-gray-500'
                        }`}
                        style={{ backgroundColor: onlineUsers.includes(member.id) ? undefined : 'var(--input-bg)' }}
                      >
                        {member.avatar || member.name?.charAt(0)}
                      </div>
                      {onlineUsers.includes(member.id) ? (
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 bg-green-400" style={{ borderColor: 'var(--bg-primary)' }} />
                      ) : null}
                      {member.role === 'leader' ? (
                        <div className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-purple-300/40 bg-purple-600 text-yellow-300 shadow-sm">
                          <Crown className="h-2 w-2" />
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(item.key)}
                    className={`dashboard-nav-item flex w-full items-center justify-center gap-3 rounded-xl p-3 transition-all lg:justify-start ${
                      activeTab === item.key
                        ? 'dashboard-nav-item--active'
                        : 'hover:bg-white/5'
                    }`}
                    style={{ color: activeTab === item.key ? undefined : 'var(--text-secondary)' }}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="hidden text-sm font-medium lg:block">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>

          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl p-3 text-red-400 transition-all hover:bg-red-400/10 lg:justify-start"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden text-sm font-medium lg:block">Logout</span>
            </button>
          </div>
        </nav>

        <div className="relative flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-4 lg:p-6">
            <div className="mb-5 lg:hidden">
              <TeamPanel currentTeam={currentTeam} onTeamChange={handleTeamChange} session={session} />
            </div>

            <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{tabTitles[activeTab]}</h1>
                  {currentTeam ? <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>{currentTeam.name}</p> : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <SearchBar />
                <NotificationsDropdown />
                <ProfileMenu
                  session={session}
                  onOpenProfile={() => setProfileUserId(currentUserId)}
                  onOpenSettings={() => navigate('/settings')}
                  onLogout={handleLogout}
                />
              </div>
            </header>

            {teamLoading ? (
              <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Loading workspace data…
              </div>
            ) : null}
            {teamLoadError ? (
              <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                <span>{teamLoadError}</span>
                <button type="button" className="font-semibold underline" onClick={() => setCurrentTeam({ ...currentTeam })}>Retry</button>
              </div>
            ) : null}
            <Suspense fallback={<div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading this project view…</div>}>
              {content}
            </Suspense>
          </div>
        </div>
      </div>

      <div>
        <Suspense fallback={null}>
          {currentTeam && activeTab === 'board' ? <QuickAddTask teamId={currentTeam.id} userId={currentUserId} /> : null}
        </Suspense>
      </div>

      <AnimatePresence>
        {profileUserId ? <UserProfile userId={profileUserId} onClose={() => setProfileUserId(null)} /> : null}
      </AnimatePresence>
    </div>
  );
}
