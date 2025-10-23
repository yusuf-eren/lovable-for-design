'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import type { DesignPlan } from '@/app/types/design';

interface PlanProposalProps {
  plan: DesignPlan;
  conversationId: string;
  onApprove: (planId: string) => void;
  onReject: (planId: string, feedback?: string) => void;
}

export function PlanProposal({ plan, conversationId, onApprove, onReject }: PlanProposalProps) {
  return (
    <div className="bg-white border border-black/10 rounded-[14px] p-6 mb-4">
      <div className="mb-4">
        <h3 className="text-[16px] font-semibold mb-1">Design Plan Proposal</h3>
        <p className="text-[13px] text-black/60">
          {plan.designType} • {plan.dimensions.width}×{plan.dimensions.height}px
        </p>
      </div>

      <div className="space-y-2 mb-6">
        {plan.items.map((item, index) => (
          <div key={index} className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-black/5 flex items-center justify-center text-[11px] font-medium text-black/60">
              {index + 1}
            </div>
            <div className="flex-1">
              <p className="text-[13px] text-black">{item.description}</p>
              {item.details && (
                <p className="text-[12px] text-black/50 mt-0.5">{item.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onApprove(plan.id)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-[14px] bg-black text-white rounded-[99px] hover:bg-black/90 transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          Approve Plan
        </button>
        <button
          onClick={() => onReject(plan.id, 'I want changes')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-[14px] border border-black/10 text-black rounded-[99px] hover:bg-black/5 transition-colors"
        >
          <XCircle className="w-4 h-4" />
          Request Changes
        </button>
      </div>
    </div>
  );
}

