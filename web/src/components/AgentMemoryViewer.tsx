import React, { useState, useEffect } from 'react';
import { Database, Search, Trash2, Key, RefreshCw } from 'lucide-react';

export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  updated_at: number;
}

interface AgentMemoryViewerProps {
  userId: string;
}

export const AgentMemoryViewer: React.FC<AgentMemoryViewerProps> = ({ userId }) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/memory?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memory || []);
      }
    } catch (e) {
      console.error('Failed to load memory:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [userId]);

  const deleteKey = async (key: string) => {
    try {
      const res = await fetch(`/api/memory/${encodeURIComponent(key)}?userId=${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.key !== key));
      }
    } catch (e) {
      console.error('Failed to delete key:', e);
    }
  };

  const filtered = memories.filter(
    (m) =>
      m.key.toLowerCase().includes(search.toLowerCase()) ||
      m.value.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Database className="w-4 h-4 text-orbit-violet" />
            Agent Knowledge & Long-Term Memory
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Key-value facts recorded by the agent across task cycles
          </p>
        </div>
        <button
          onClick={fetchMemories}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Refresh memory store"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Filter memories by key or content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-orbit-darker border border-orbit-border text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orbit-violet font-mono"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-xs text-slate-500 font-mono">Loading memory records...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-orbit-border/60 bg-orbit-card/40 backdrop-blur-md">
          <Key className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
          <p className="text-sm text-slate-300 font-medium">No stored memory entries found</p>
          <p className="text-xs text-slate-500 mt-1">
            As the agent finishes tasks, price benchmarks, discovered links, and findings will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5">
          {filtered.map((item) => (
            <div
              key={item.id || item.key}
              className="p-3.5 rounded-xl border border-orbit-border/80 bg-orbit-card/70 backdrop-blur-md flex items-start justify-between gap-3 group hover:border-slate-700 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-semibold text-orbit-cyan bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {item.key}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(item.updated_at).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-300 break-words leading-relaxed pl-1">
                  {item.value}
                </p>
              </div>

              <button
                onClick={() => deleteKey(item.key)}
                className="opacity-60 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 transition-all"
                title="Delete memory item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
