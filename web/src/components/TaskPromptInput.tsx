import React, { useState } from 'react';
import { Send, Plane, Newspaper, Globe, ShieldAlert, Sparkles } from 'lucide-react';

interface TaskPromptInputProps {
  onDispatch: (prompt: string) => void;
  disabled?: boolean;
}

export const TaskPromptInput: React.FC<TaskPromptInputProps> = ({ onDispatch, disabled }) => {
  const [prompt, setPrompt] = useState('');

  const blueprints = [
    {
      id: 'flight',
      label: 'Flight Price Watcher',
      icon: <Plane className="w-3.5 h-3.5 text-sky-400" />,
      text: 'Monitor flight prices from Chișinău to London under $125',
    },
    {
      id: 'hn',
      label: 'HN AI Trend Radar',
      icon: <Newspaper className="w-3.5 h-3.5 text-amber-400" />,
      text: 'Extract top AI announcements from Hacker News and summarize trends',
    },
    {
      id: 'diff',
      label: 'Website Diff Monitor',
      icon: <Globe className="w-3.5 h-3.5 text-emerald-400" />,
      text: 'Inspect website status for breaking updates and schedule periodic diffs',
    },
    {
      id: 'hitl',
      label: 'Webhook (HITL Approval)',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />,
      text: 'Prepare and dispatch outbound webhook payload with human clearance',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || disabled) return;
    onDispatch(prompt.trim());
    setPrompt('');
  };

  const handleSelectBlueprint = (text: string) => {
    setPrompt(text);
  };

  return (
    <div className="space-y-3">
      {/* Quick-Launch Blueprint Chips */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-medium">
          <Sparkles className="w-3 h-3 text-orbit-cyan" />
          <span>Action Blueprints:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {blueprints.map((bp) => (
            <button
              key={bp.id}
              type="button"
              onClick={() => handleSelectBlueprint(bp.text)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-orbit-border/80 bg-orbit-card/70 hover:bg-slate-800 hover:border-slate-600 text-xs font-medium text-slate-300 transition-all active:scale-95"
            >
              {bp.icon}
              <span>{bp.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Prompt Bar */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="State your goal (e.g., 'Track flight price drops', 'Scrape tech news')..."
          disabled={disabled}
          className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-orbit-card/90 border border-orbit-border/90 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orbit-cyan focus:ring-1 focus:ring-orbit-cyan shadow-xl transition-all font-sans"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || disabled}
          className="absolute right-2 p-2.5 rounded-xl bg-gradient-to-r from-orbit-cyan to-orbit-violet text-slate-950 font-bold hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
          title="Launch autonomous goal"
        >
          <Send className="w-4 h-4 text-slate-950" />
        </button>
      </form>
    </div>
  );
};
