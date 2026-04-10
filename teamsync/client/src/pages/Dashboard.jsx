import React from 'react';
import { motion } from 'framer-motion';
import { LogOut, LayoutDashboard, CheckSquare, Users, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DashboardPage({ session }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex h-screen bg-[#0d0c13] text-gray-200 overflow-hidden font-sans">
      
      {/* Sidebar Navigation */}
      <motion.nav 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="glass-panel w-20 md:w-64 flex flex-col justify-between py-6 px-4 m-4 rounded-3xl z-10"
      >
        <div>
          <div className="flex items-center justify-center md:justify-start gap-4 mb-10 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
              T
            </div>
            <h2 className="hidden md:block font-bold text-xl tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">TeamSync</h2>
          </div>
          
          <ul className="space-y-4">
            {[
              { icon: LayoutDashboard, label: 'Board', active: true },
              { icon: CheckSquare, label: 'Tasks' },
              { icon: Users, label: 'Team' },
              { icon: Settings, label: 'Settings' }
            ].map((item, i) => (
              <li key={i}>
                <button className={`w-full flex items-center justify-center md:justify-start gap-4 p-3 rounded-2xl transition-all ${item.active ? 'bg-white/10 text-white shadow-md shadow-black/10' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                  <item.icon className="w-5 h-5" />
                  <span className="hidden md:block font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <button onClick={handleLogout} className="flex items-center justify-center md:justify-start gap-4 p-3 rounded-2xl text-red-400 hover:bg-red-400/10 transition-all">
          <LogOut className="w-5 h-5" />
          <span className="hidden md:block font-medium">Logout</span>
        </button>
      </motion.nav>

      {/* Main Content Area (Bento Grid Example) */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome back!</h1>
            <p className="text-gray-400 font-medium tracking-wide">Ready for a crunch session?</p>
          </div>
          <div className="w-12 h-12 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-xl font-bold backdrop-blur-md">
            {session?.user?.email?.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* Bento Box Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[200px]">
          {/* Main Tasks Box */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-panel md:col-span-2 md:row-span-2 rounded-3xl p-6 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <h3 className="text-xl font-semibold mb-4 text-white">Active Tasks</h3>
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-center">
                <span className="text-gray-300">Migrate app to React ⚛️</span>
                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm font-medium border border-purple-500/20">In Progress</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-center">
                <span className="text-gray-300">Implement Gen-Z UI 💅</span>
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm font-medium border border-blue-500/20">To Do</span>
              </div>
            </div>
          </motion.div>

          {/* Pomodoro/Timer Box */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass-panel rounded-3xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 z-0" />
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-2 z-10">Crunch Time</h3>
            <div className="text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 z-10 drop-shadow-md">
              25:00
            </div>
            <button className="mt-6 font-semibold bg-white text-black px-6 py-2 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform z-10">
              Start
            </button>
          </motion.div>

          {/* Team Banter / Streak Box */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-panel rounded-3xl p-6 relative"
          >
            <h3 className="text-lg font-semibold mb-2">Team Vibe Check</h3>
            <p className="text-sm text-gray-400 mb-4">No one is currently online. 😴</p>
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center gap-3">
              <span className="text-2xl">🔥</span>
              <span className="font-bold text-orange-200">5 Day Streak!</span>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
