import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, Trash2, Plus, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

export interface ScheduledJob {
  id: string;
  name: string;
  cron_expression: string;
  prompt: string;
  is_active: number;
  last_run_at: number | null;
  next_run_at: number;
  created_at: number;
}

interface ActiveTasksListProps {
  userId: string;
  onRunNow?: (prompt: string) => void;
}

export const ActiveTasksList: React.FC<ActiveTasksListProps> = ({ userId, onRunNow }) => {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [cron, setCron] = useState('0 */4 * * *');
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/schedules?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (e: any) {
      console.error('Failed to fetch schedules:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [userId]);

  const toggleJob = async (id: string) => {
    try {
      const res = await fetch(`/api/schedules/${id}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        setJobs((prev) =>
          prev.map((j) => (j.id === id ? { ...j, is_active: j.is_active ? 0 : 1 } : j))
        );
      }
    } catch (e) {
      console.error('Toggle failed:', e);
    }
  };

  const deleteJob = async (id: string) => {
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== id));
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, cron_expression: cron, prompt, userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create schedule');
      }
      setIsModalOpen(false);
      setName('');
      setPrompt('');
      fetchJobs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orbit-cyan" />
            Background Autonomous Automations
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Recurring tasks running on 24/7 server cron timers</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orbit-cyan hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-colors shadow-lg shadow-cyan-950/40"
        >
          <Plus className="w-3.5 h-3.5" />
          Schedule Job
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-xs text-slate-500 font-mono">Loading active schedules...</div>
      ) : jobs.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-orbit-border/60 bg-orbit-card/40 backdrop-blur-md">
          <Calendar className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-300 font-medium">No background automations registered</p>
          <p className="text-xs text-slate-500 mt-1">
            Create a recurring monitor or tell the agent in chat to "check every 30 minutes".
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-4 rounded-xl border border-orbit-border/80 bg-orbit-card/70 backdrop-blur-md shadow-md hover:border-slate-700 transition-colors flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-100">{job.name}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                        job.is_active
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                      }`}
                    >
                      {job.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono text-orbit-cyan bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                      {job.cron_expression}
                    </span>
                    <span className="text-xs text-slate-400">
                      Next: {new Date(job.next_run_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {onRunNow && (
                    <button
                      onClick={() => onRunNow(job.prompt)}
                      className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-orbit-cyan text-xs transition-colors"
                      title="Run now immediately"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => toggleJob(job.id)}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                    title={job.is_active ? 'Pause automation' : 'Resume automation'}
                  >
                    {job.is_active ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button
                    onClick={() => deleteJob(job.id)}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete automation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 bg-orbit-darker/60 p-2 rounded-lg font-mono leading-relaxed">
                {job.prompt}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal to register new schedule */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md rounded-2xl border border-orbit-border bg-orbit-card p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-100">Schedule Background Automation</h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Automation Name</label>
              <input
                type="text"
                required
                placeholder="e.g., Flight Radar Sentinel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-orbit-darker border border-orbit-border text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orbit-cyan"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Cron Expression</span>
                <span className="text-[11px] text-slate-500 font-mono">5-part cron syntax</span>
              </label>
              <input
                type="text"
                required
                placeholder="0 */4 * * *"
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-orbit-darker border border-orbit-border text-sm font-mono text-orbit-cyan focus:outline-none focus:border-orbit-cyan"
              />
              <div className="flex gap-1.5 text-[11px] text-slate-400 font-mono mt-1">
                <span onClick={() => setCron('*/15 * * * *')} className="cursor-pointer hover:text-orbit-cyan underline">15m</span>
                <span>•</span>
                <span onClick={() => setCron('0 * * * *')} className="cursor-pointer hover:text-orbit-cyan underline">Hourly</span>
                <span>•</span>
                <span onClick={() => setCron('0 */4 * * *')} className="cursor-pointer hover:text-orbit-cyan underline">4 Hours</span>
                <span>•</span>
                <span onClick={() => setCron('0 9 * * *')} className="cursor-pointer hover:text-orbit-cyan underline">Daily 09:00</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Autonomous Prompt / Goal</label>
              <textarea
                required
                rows={3}
                placeholder="What should the agent check and execute on each cycle?"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-orbit-darker border border-orbit-border text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orbit-cyan resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-orbit-cyan hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-colors shadow-lg shadow-cyan-950/40"
              >
                Register Schedule
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
