import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Copy, Check, Trash2, ArrowDown } from 'lucide-react';
import { AgentStep } from '../hooks/useAgentStream';

interface LiveLogTerminalProps {
  steps: AgentStep[];
  onClear?: () => void;
}

export const LiveLogTerminal: React.FC<LiveLogTerminalProps> = ({ steps, onClear }) => {
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<'all' | 'thoughts' | 'tools'>('all');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [steps, autoScroll]);

  const filteredSteps = steps.filter((s) => {
    if (filter === 'thoughts') return s.type === 'THOUGHT' || s.type === 'FINAL_ANSWER';
    if (filter === 'tools') return s.type === 'ACTION' || s.type === 'OBSERVATION';
    return true;
  });

  const handleCopy = () => {
    const text = steps
      .map(
        (s) =>
          `[${new Date(s.timestamp).toISOString()}] [${s.type}] ${
            s.thought || ''
          } ${s.toolName ? `Tool: ${s.toolName}(${JSON.stringify(s.toolInput || {})})` : ''} ${
            s.toolOutput ? `-> ${s.toolOutput}` : ''
          }`
      )
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-orbit-border/80 bg-orbit-darker/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col font-mono">
      {/* Terminal Titlebar */}
      <div className="flex items-center justify-between px-4 py-3 bg-orbit-card/80 border-b border-orbit-border/60 select-none">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 ml-2">
            <Terminal className="w-3.5 h-3.5 text-orbit-cyan" />
            telemetry.stdout
          </span>
        </div>

        {/* Filter Controls & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900/90 rounded-lg p-0.5 border border-slate-800 text-[11px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded ${filter === 'all' ? 'bg-orbit-cyan/20 text-orbit-cyan' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('thoughts')}
              className={`px-2 py-0.5 rounded ${filter === 'thoughts' ? 'bg-orbit-cyan/20 text-orbit-cyan' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Thoughts
            </button>
            <button
              onClick={() => setFilter('tools')}
              className={`px-2 py-0.5 rounded ${filter === 'tools' ? 'bg-orbit-cyan/20 text-orbit-cyan' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Tools
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Copy logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Output Body */}
      <div className="p-4 overflow-y-auto max-h-96 min-h-[16rem] text-xs space-y-2.5">
        {filteredSteps.length === 0 ? (
          <div className="text-slate-600 italic py-8 text-center">No terminal logs recorded yet.</div>
        ) : (
          filteredSteps.map((s, idx) => (
            <div key={idx} className="flex gap-2.5 items-start leading-relaxed group">
              <span className="text-slate-600 select-none text-[11px] pt-0.5 w-7 text-right shrink-0">
                {idx + 1}
              </span>
              <span className="text-slate-500 shrink-0 select-none text-[11px] pt-0.5">
                {new Date(s.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <div className="flex-1 break-words">
                {s.type === 'THOUGHT' && (
                  <span className="text-sky-300">
                    <span className="text-sky-500 font-bold mr-1.5">[THOUGHT]</span>
                    {s.thought}
                  </span>
                )}
                {s.type === 'ACTION' && (
                  <span className="text-amber-300">
                    <span className="text-amber-500 font-bold mr-1.5">[ACTION]</span>
                    {s.toolName}({JSON.stringify(s.toolInput)})
                  </span>
                )}
                {s.type === 'OBSERVATION' && (
                  <span className="text-emerald-400">
                    <span className="text-emerald-500 font-bold mr-1.5">[OBSERVE]</span>
                    {s.toolOutput}
                  </span>
                )}
                {s.type === 'FINAL_ANSWER' && (
                  <span className="text-purple-300 font-semibold">
                    <span className="text-purple-400 font-bold mr-1.5">[FINAL]</span>
                    {s.finalAnswer || s.thought}
                  </span>
                )}
                {s.type === 'WAITING_APPROVAL' && (
                  <span className="text-rose-400 font-semibold">
                    <span className="text-rose-500 font-bold mr-1.5">[SUSPENDED]</span>
                    Waiting human clearance for {s.toolName}
                  </span>
                )}
                {s.type === 'SYSTEM' && (
                  <span className="text-slate-400">
                    <span className="text-slate-500 font-bold mr-1.5">[SYSTEM]</span>
                    {s.thought}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
