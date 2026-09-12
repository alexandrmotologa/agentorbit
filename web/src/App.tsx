import React, { useState, useEffect } from 'react';
import { useTelegram } from './hooks/useTelegram';
import { useAgentStream } from './hooks/useAgentStream';
import { ThoughtChain } from './components/ThoughtChain';
import { LiveLogTerminal } from './components/LiveLogTerminal';
import { HumanApprovalModal } from './components/HumanApprovalModal';
import { ActiveTasksList } from './components/ActiveTasksList';
import { AgentMemoryViewer } from './components/AgentMemoryViewer';
import { TaskPromptInput } from './components/TaskPromptInput';
import { Zap, Clock, Database, Terminal, Cpu, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

export function App() {
  const { user, userId, haptic } = useTelegram();

  // Get initial taskId from URL query if opened from Telegram button
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('taskId');
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<'live' | 'schedules' | 'memory' | 'terminal'>('live');
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  const { steps, status, pendingApproval, finalAnswer, submitApproval } = useAgentStream(currentTaskId);

  // Fetch recent tasks on mount
  const fetchRecentTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?userId=${userId}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setRecentTasks(data.tasks || []);
        if (!currentTaskId && data.tasks && data.tasks.length > 0) {
          setCurrentTaskId(data.tasks[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load recent tasks:', e);
    }
  };

  useEffect(() => {
    fetchRecentTasks();
  }, [userId]);

  // Dispatch new autonomous task
  const handleDispatch = async (prompt: string) => {
    haptic('medium');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentTaskId(data.taskId);
        setActiveTab('live');
        fetchRecentTasks();
      }
    } catch (e) {
      console.error('Dispatch failed:', e);
      haptic('error');
    }
  };

  const handleApprove = () => {
    haptic('success');
    submitApproval(true);
  };

  const handleDeny = () => {
    haptic('warning');
    submitApproval(false);
  };

  return (
    <div className="min-h-screen bg-orbit-darker text-slate-100 flex flex-col max-w-2xl mx-auto pb-8">
      {/* Top Mission Control Header */}
      <header className="sticky top-0 z-40 px-4 py-3.5 bg-orbit-darker/90 backdrop-blur-xl border-b border-orbit-border/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-orbit-cyan/20 to-orbit-violet/20 border border-orbit-cyan/40 p-1 flex items-center justify-center">
            <img src="/logo.svg" alt="AgentOrbit Logo" className="w-full h-full object-contain" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orbit-emerald border-2 border-orbit-darker animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-slate-100">AgentOrbit</h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orbit-cyan/15 text-orbit-cyan border border-orbit-cyan/30">
                COCKPIT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">Autonomous Execution Engine</p>
          </div>
        </div>

        {/* User Status / Mode Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <Cpu className="w-3 h-3 text-orbit-cyan" />
            <span className="text-slate-300 font-mono text-[11px]">
              {user?.first_name || 'Pilot'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex p-1 rounded-2xl bg-orbit-card/80 border border-orbit-border/80 shadow-lg text-xs font-medium">
          <button
            onClick={() => {
              setActiveTab('live');
              haptic('light');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${
              activeTab === 'live'
                ? 'bg-gradient-to-r from-orbit-cyan/20 to-orbit-violet/20 text-orbit-cyanBright border border-orbit-cyan/30 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Live Run
          </button>
          <button
            onClick={() => {
              setActiveTab('schedules');
              haptic('light');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${
              activeTab === 'schedules'
                ? 'bg-gradient-to-r from-orbit-cyan/20 to-orbit-violet/20 text-orbit-cyanBright border border-orbit-cyan/30 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Schedules
          </button>
          <button
            onClick={() => {
              setActiveTab('memory');
              haptic('light');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${
              activeTab === 'memory'
                ? 'bg-gradient-to-r from-orbit-cyan/20 to-orbit-violet/20 text-orbit-cyanBright border border-orbit-cyan/30 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Memory
          </button>
          <button
            onClick={() => {
              setActiveTab('terminal');
              haptic('light');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${
              activeTab === 'terminal'
                ? 'bg-gradient-to-r from-orbit-cyan/20 to-orbit-violet/20 text-orbit-cyanBright border border-orbit-cyan/30 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Terminal
          </button>
        </div>

        {/* Tab 1: Live Run View */}
        {activeTab === 'live' && (
          <div className="space-y-4">
            {/* Prompt Dispatcher */}
            <TaskPromptInput onDispatch={handleDispatch} disabled={status === 'running'} />

            {/* Task Selector if multiple tasks exist */}
            {recentTasks.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-[11px] text-slate-500 font-mono shrink-0">Recent:</span>
                {recentTasks.slice(0, 5).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setCurrentTaskId(t.id);
                      haptic('light');
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono whitespace-nowrap transition-all ${
                      currentTaskId === t.id
                        ? 'bg-orbit-cyan/15 border-orbit-cyan/40 text-orbit-cyan font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {t.prompt.length > 20 ? t.prompt.slice(0, 20) + '...' : t.prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Thought Chain Execution Stepper */}
            <ThoughtChain
              steps={steps}
              status={status}
              pendingApproval={pendingApproval}
              finalAnswer={finalAnswer}
              onApprove={handleApprove}
              onDeny={handleDeny}
            />
          </div>
        )}

        {/* Tab 2: Schedules */}
        {activeTab === 'schedules' && (
          <ActiveTasksList
            userId={userId}
            onRunNow={(prompt) => {
              setActiveTab('live');
              handleDispatch(prompt);
            }}
          />
        )}

        {/* Tab 3: Agent Memory Store */}
        {activeTab === 'memory' && <AgentMemoryViewer userId={userId} />}

        {/* Tab 4: Terminal Logs */}
        {activeTab === 'terminal' && <LiveLogTerminal steps={steps} />}
      </main>

      {/* Human Approval Modal (High-Priority Overlay) */}
      {status === 'waiting_approval' && pendingApproval && (
        <HumanApprovalModal
          approval={pendingApproval}
          onApprove={handleApprove}
          onDeny={handleDeny}
        />
      )}
    </div>
  );
}
export default App;
