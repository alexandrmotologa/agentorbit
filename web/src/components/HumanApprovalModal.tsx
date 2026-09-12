import React from 'react';
import { ShieldAlert, Check, X, AlertTriangle } from 'lucide-react';
import { PendingApproval } from '../hooks/useAgentStream';

interface HumanApprovalModalProps {
  approval: PendingApproval;
  onApprove: () => void;
  onDeny: () => void;
}

export const HumanApprovalModal: React.FC<HumanApprovalModalProps> = ({ approval, onApprove, onDeny }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border-2 border-orbit-amber bg-orbit-card shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orbit-amber/20 border border-orbit-amber/40 flex items-center justify-center text-orbit-amber">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">Human Clearance Required</h3>
            <p className="text-xs text-slate-400">Agent requests permission to invoke external tool</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-orbit-darker border border-orbit-border space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Tool Target:</span>
            <span className="font-mono text-orbit-cyan font-semibold bg-orbit-cyan/10 px-2 py-0.5 rounded border border-orbit-cyan/20">
              {approval.toolName}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-1">Invocation Parameters:</span>
            <pre className="p-2 rounded bg-black/60 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-40">
              {JSON.stringify(approval.parameters, null, 2)}
            </pre>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            Executing external webhooks or modifying operational records could trigger irreversible external actions.
          </span>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onApprove}
            className="flex-1 py-2.5 px-4 rounded-xl bg-orbit-emerald hover:bg-emerald-500 text-slate-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40"
          >
            <Check className="w-4 h-4" />
            Approve Action
          </button>
          <button
            onClick={onDeny}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
          >
            <X className="w-4 h-4 text-rose-400" />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};
