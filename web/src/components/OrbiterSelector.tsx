import React from 'react';
import { Radio, TrendingUp, Sparkles, Activity } from 'lucide-react';

export type OrbiterType = 'scout' | 'bargain' | 'uptime' | 'brief';

export interface OrbiterInfo {
  id: OrbiterType;
  name: string;
  tagline: string;
  icon: React.ReactNode;
  accentClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  blueprints: Array<{ label: string; prompt: string }>;
}

export const ORBITERS: OrbiterInfo[] = [
  {
    id: 'scout',
    name: 'Radar Scout',
    tagline: 'Tech intelligence, GitHub & trend discovery',
    icon: <Radio className="w-4 h-4" />,
    accentClass: 'text-orbit-cyan',
    bgClass: 'from-orbit-cyan/15 to-blue-900/10',
    borderClass: 'border-orbit-cyan/50',
    badgeClass: 'bg-orbit-cyan/15 text-orbit-cyan border-orbit-cyan/30',
    blueprints: [
      { label: '📰 Tech AI Radar', prompt: 'Scan Hacker News and GitHub for trending open-source AI agent frameworks' },
      { label: '🔍 Discover MCP Tools', prompt: 'Search the web for new Model Context Protocol servers and developer tools' },
    ],
  },
  {
    id: 'bargain',
    name: 'Bargain Sentinel',
    tagline: 'Continuous fares, flights & deal sentinels',
    icon: <TrendingUp className="w-4 h-4" />,
    accentClass: 'text-orbit-emerald',
    bgClass: 'from-orbit-emerald/15 to-teal-900/10',
    borderClass: 'border-orbit-emerald/50',
    badgeClass: 'bg-orbit-emerald/15 text-orbit-emerald border-orbit-emerald/30',
    blueprints: [
      { label: '✈️ Chișinău-London Fares', prompt: 'Monitor flight prices from Chișinău to London under $120' },
      { label: '🏷️ Price Drop Threshold', prompt: 'Track lowest price for target tech gear and schedule alerts' },
    ],
  },
  {
    id: 'uptime',
    name: 'Uptime Watchdog',
    tagline: 'High-reliability status, SSL & latency sentinel',
    icon: <Activity className="w-4 h-4" />,
    accentClass: 'text-orbit-amber',
    bgClass: 'from-orbit-amber/15 to-amber-900/10',
    borderClass: 'border-orbit-amber/50',
    badgeClass: 'bg-orbit-amber/15 text-orbit-amber border-orbit-amber/30',
    blueprints: [
      { label: '🛡️ Service Latency Heartbeat', prompt: 'Inspect target endpoint health, response latency, and schedule 15m ping' },
      { label: '🔍 SSL & Header Auditor', prompt: 'Check TLS validity and HTTP response headers for target URL' },
    ],
  },
  {
    id: 'brief',
    name: 'Executive Briefer',
    tagline: 'High-density synthesis & decision briefings',
    icon: <Sparkles className="w-4 h-4" />,
    accentClass: 'text-orbit-violet',
    bgClass: 'from-orbit-violet/15 to-purple-900/10',
    borderClass: 'border-orbit-violet/50',
    badgeClass: 'bg-orbit-violet/15 text-orbit-violet border-orbit-violet/30',
    blueprints: [
      { label: '⚡ Daily Tech Brief', prompt: 'Compile executive research brief on autonomous agent systems with key takeaways' },
      { label: '📊 Market Pulse Digest', prompt: 'Synthesize market movements and stored benchmarks into structured summary' },
    ],
  },
];

interface OrbiterSelectorProps {
  selected: OrbiterType;
  onSelect: (orbiter: OrbiterType) => void;
}

export const OrbiterSelector: React.FC<OrbiterSelectorProps> = ({ selected, onSelect }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-orbit-cyan" />
          Active Agent Orbiter
        </span>
        <span className="text-[10px] font-mono text-slate-500">Select specialized capability</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ORBITERS.map((orb) => {
          const isSelected = selected === orb.id;
          return (
            <button
              key={orb.id}
              type="button"
              onClick={() => onSelect(orb.id)}
              className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? `bg-gradient-to-br ${orb.bgClass} ${orb.borderClass} shadow-md shadow-slate-950/40 ring-1 ring-white/10`
                  : 'bg-orbit-card/60 border-orbit-border/70 hover:border-slate-700 hover:bg-orbit-card/90'
              }`}
            >
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-orbit-cyanBright animate-ping" />
              )}
              <div className="flex items-center gap-1.5 mb-1">
                <span className={orb.accentClass}>{orb.icon}</span>
                <span
                  className={`text-xs font-semibold tracking-tight ${
                    isSelected ? 'text-slate-100' : 'text-slate-300'
                  }`}
                >
                  {orb.name}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">{orb.tagline}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
