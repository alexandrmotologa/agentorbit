import React, { useState } from 'react';
import {
  Brain,
  Wrench,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Download,
  Copy,
  Check,
  GitBranch,
  FileText,
} from 'lucide-react';
import { AgentStep, PendingApproval } from '../hooks/useAgentStream';

interface ThoughtChainProps {
  steps: AgentStep[];
  status: 'idle' | 'running' | 'waiting_approval' | 'completed' | 'failed';
  pendingApproval: PendingApproval | null;
  finalAnswer: string | null;
  taskPrompt?: string;
  orbiter?: string;
  onApprove?: () => void;
  onDeny?: () => void;
  onBranch?: (prompt: string, orbiter?: string) => void;
}

export const ThoughtChain: React.FC<ThoughtChainProps> = ({
  steps,
  status,
  pendingApproval,
  finalAnswer,
  taskPrompt = '',
  orbiter = 'scout',
  onApprove,
  onDeny,
  onBranch,
}) => {
  const [expandedParams, setExpandedParams] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  const toggleParams = (idx: number) => {
    setExpandedParams((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (steps.length === 0 && status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border border-orbit-border/60 rounded-2xl bg-orbit-card/40 backdrop-blur-md">
        <div className="w-16 h-16 mb-4 rounded-2xl bg-orbit-cyan/10 border border-orbit-cyan/30 flex items-center justify-center text-orbit-cyan">
          <Brain className="w-8 h-8 animate-pulse-subtle" />
        </div>
        <h3 className="text-lg font-semibold text-slate-200">Autonomous Execution Standby</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-sm">
          Dispatch an objective or select a blueprint below to watch the live reasoning and tool execution loop.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step Timeline */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-orbit-cyan/80 before:via-orbit-violet/50 before:to-orbit-emerald/80">
        {steps.map((step, idx) => {
          const isThought = step.type === 'THOUGHT' || step.type === 'SYSTEM';
          const isAction = step.type === 'ACTION';
          const isObservation = step.type === 'OBSERVATION';
          const isFinal = step.type === 'FINAL_ANSWER';
          const isApproval = step.type === 'WAITING_APPROVAL';

          return (
            <div key={idx} className="relative group transition-all duration-300">
              {/* Bullet Node */}
              <div
                className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs transition-transform duration-200 group-hover:scale-110 ${
                  isThought
                    ? 'bg-orbit-darker border-orbit-cyan text-orbit-cyan'
                    : isAction
                    ? 'bg-orbit-darker border-orbit-amber text-orbit-amber'
                    : isObservation
                    ? 'bg-orbit-darker border-orbit-emerald text-orbit-emerald'
                    : isApproval
                    ? 'bg-orbit-darker border-orbit-rose text-orbit-rose animate-pulse'
                    : 'bg-orbit-darker border-orbit-violet text-orbit-violet'
                }`}
              >
                {isThought && <Brain className="w-3 h-3" />}
                {isAction && <Wrench className="w-3 h-3" />}
                {isObservation && <Eye className="w-3 h-3" />}
                {isApproval && <AlertTriangle className="w-3 h-3" />}
                {isFinal && <CheckCircle2 className="w-3 h-3" />}
              </div>

              {/* Step Card Content */}
              <div className="rounded-xl border border-orbit-border/80 bg-orbit-card/60 backdrop-blur-md p-4 shadow-lg hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isThought
                          ? 'bg-orbit-cyan/15 text-orbit-cyan border border-orbit-cyan/30'
                          : isAction
                          ? 'bg-orbit-amber/15 text-orbit-amber border border-orbit-amber/30'
                          : isObservation
                          ? 'bg-orbit-emerald/15 text-orbit-emerald border border-orbit-emerald/30'
                          : isApproval
                          ? 'bg-orbit-rose/15 text-orbit-rose border border-orbit-rose/30'
                          : 'bg-orbit-violet/15 text-orbit-violet border border-orbit-violet/30'
                      }`}
                    >
                      {step.type.replace('_', ' ')}
                    </span>
                    {step.toolName && (
                      <span className="text-xs font-mono text-slate-300 font-semibold bg-slate-800/80 px-2 py-0.5 rounded">
                        {step.toolName}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                {/* Thought or Description */}
                {step.thought && <p className="text-sm text-slate-200 leading-relaxed mt-1">{step.thought}</p>}

                {/* Tool Input parameters toggle */}
                {step.toolInput && (
                  <div className="mt-2.5">
                    <button
                      onClick={() => toggleParams(idx)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors font-mono"
                    >
                      {expandedParams[idx] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      Parameters ({Object.keys(step.toolInput).length})
                    </button>
                    {expandedParams[idx] && (
                      <pre className="mt-2 p-2.5 rounded-lg bg-orbit-darker/90 border border-slate-800 text-xs font-mono text-orbit-cyanBright overflow-x-auto">
                        {JSON.stringify(step.toolInput, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                {/* Tool Observation Output */}
                {step.toolOutput && (
                  <div className="mt-2 p-3 rounded-lg bg-orbit-darker/80 border border-slate-800/80 text-xs font-mono text-emerald-400/90 whitespace-pre-wrap leading-relaxed">
                    {step.toolOutput}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live Running Indicator */}
        {status === 'running' && (
          <div className="relative pl-0">
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-orbit-cyan/30 bg-orbit-cyan/5 backdrop-blur-md">
              <div className="w-4 h-4 rounded-full border-2 border-orbit-cyan border-t-transparent animate-spin" />
              <span className="text-xs font-mono text-orbit-cyan font-medium animate-pulse">
                Autonomous agent reasoning in progress...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Human-in-the-Loop Clearance Banner */}
      {status === 'waiting_approval' && pendingApproval && (
        <div className="p-4 rounded-2xl border-2 border-orbit-amber bg-orbit-amber/10 backdrop-blur-lg shadow-2xl space-y-3">
          <div className="flex items-center gap-2.5 text-orbit-amber font-semibold">
            <ShieldCheck className="w-5 h-5" />
            <span>Operator Clearance Requested</span>
          </div>
          <p className="text-xs text-slate-300">
            The agent paused execution to request confirmation before invoking tool{' '}
            <code className="px-1.5 py-0.5 rounded bg-orbit-darker text-orbit-cyan font-mono text-xs">
              {pendingApproval.toolName}
            </code>
            .
          </p>
          <pre className="p-2 rounded bg-orbit-darker/90 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-32">
            {JSON.stringify(pendingApproval.parameters, null, 2)}
          </pre>
          <div className="flex gap-2 pt-1">
            <button
              onClick={onApprove}
              className="flex-1 py-2 px-4 rounded-xl bg-orbit-emerald hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition-colors shadow-lg shadow-emerald-950/50"
            >
              Approve Execution
            </button>
            <button
              onClick={onDeny}
              className="py-2 px-4 rounded-xl bg-orbit-rose/20 hover:bg-orbit-rose/30 text-rose-300 font-semibold text-xs border border-rose-500/40 transition-colors"
            >
              Deny
            </button>
          </div>
        </div>
      )}

      {/* Final Answer Banner with 1-Click Export & Branching */}
      {finalAnswer && (
        <div className="p-5 rounded-2xl border border-orbit-emerald/40 bg-gradient-to-br from-orbit-emerald/10 via-orbit-card to-orbit-emerald/5 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-orbit-emerald font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Mission Deliverable Finalized</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orbit-emerald/15 text-orbit-emerald border border-orbit-emerald/30">
              {orbiter?.toUpperCase() || 'SCOUT'}
            </span>
          </div>

          <p className="text-sm text-slate-100 leading-relaxed font-sans whitespace-pre-wrap">{finalAnswer}</p>

          {/* Action Toolbar: Export Deliverable & Branch */}
          <div className="pt-2 border-t border-orbit-border/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {/* Copy Markdown */}
              <button
                type="button"
                onClick={() => {
                  const md = `# AgentOrbit Deliverable: ${taskPrompt || 'Task'}\n\n**Orbiter**: ${orbiter}\n**Date**: ${new Date().toISOString()}\n\n## Final Answer\n${finalAnswer}\n\n## Execution Steps\n${steps
                    .map((s) => `- **[${s.type}]** ${s.thought || s.toolName || ''}`)
                    .join('\n')}`;
                  navigator.clipboard.writeText(md);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                title="Copy Markdown report to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-orbit-emerald" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              {/* Download .md file */}
              <button
                type="button"
                onClick={() => {
                  const md = `# AgentOrbit Deliverable: ${taskPrompt || 'Task'}\n\n**Orbiter**: ${orbiter}\n**Date**: ${new Date().toISOString()}\n\n## Final Deliverable\n${finalAnswer}\n\n## Execution Trace\n${steps
                    .map(
                      (s, i) =>
                        `### Step ${i + 1}: ${s.type} ${s.toolName ? `(${s.toolName})` : ''}\n${s.thought ? `> ${s.thought}\n` : ''}${
                          s.toolOutput ? `\`\`\`\n${s.toolOutput}\n\`\`\`\n` : ''
                        }`
                    )
                    .join('\n')}`;
                  const blob = new Blob([md], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `agentorbit_deliverable_${Date.now()}.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                title="Download as Markdown file"
              >
                <FileText className="w-3.5 h-3.5 text-orbit-cyan" />
                <span>.md</span>
              </button>

              {/* Download JSON trace */}
              <button
                type="button"
                onClick={() => {
                  const data = {
                    prompt: taskPrompt,
                    orbiter,
                    finalAnswer,
                    steps,
                    exportedAt: new Date().toISOString(),
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `agentorbit_trace_${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                title="Download complete JSON execution trace"
              >
                <Download className="w-3.5 h-3.5 text-orbit-violet" />
                <span>JSON</span>
              </button>
            </div>

            {/* Branch / Re-run Goal */}
            {onBranch && (
              <button
                type="button"
                onClick={() => onBranch(taskPrompt, orbiter)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orbit-cyan/15 hover:bg-orbit-cyan/25 text-orbit-cyan border border-orbit-cyan/30 text-xs font-semibold transition-all active:scale-95"
                title="Branch or re-run this goal with tweaked instructions"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Branch / Re-run</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
