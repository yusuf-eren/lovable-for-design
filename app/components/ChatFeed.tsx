'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { UIRunState } from '@/app/components/ui/types';
import { isHandoffToolName } from '@/app/lib/handy';

export function ChatFeed({
  state,
  hideHandoffToolCalls = false,
  onApprovePlan,
  onRejectPlan,
}: {
  state: UIRunState;
  hideHandoffToolCalls?: boolean;
  onApprovePlan?: (planId: string) => void;
  onRejectPlan?: (planId: string, feedback?: string) => void;
}) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const toggleTool = (id: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {state.timeline.map((item, index) => {
        if (item.kind === 'message') {
          return (
            <div
              key={item.id}
              className={`${item.role === 'user' ? 'text-right' : 'text-left'} animate-slide-in-left`}
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
            >
              <div
                className={`inline-block max-w-[85%] ${
                  item.role === 'user' ? 'bg-black text-white' : 'bg-black/5'
                } rounded-[20px] px-4 py-3 text-[14px]`}
              >
                {item.images && item.images.length > 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {item.images.map((src, idx) => (
                      <div
                        key={idx}
                        className="w-12 h-12 rounded-lg overflow-hidden border border-white/20"
                      >
                        <Image
                          src={src}
                          alt=""
                          width={48}
                          height={48}
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className={`prose prose-sm max-w-none ${item.role === 'user' ? 'prose-invert' : ''}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {item.text}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          );
        }

        if (item.kind === 'tool_call') {
          if (hideHandoffToolCalls && isHandoffToolName(item.name)) {
            return null;
          }
          
          const isExpanded = expandedTools.has(item.id);
          const isInProgress = item.status === 'in_progress';
          const actionText = isInProgress ? 'calling' : 'called';

          return (
            <div key={item.id} className="text-left">
              <button
                onClick={() => toggleTool(item.id)}
                className="inline-flex items-center gap-2 text-[13px] text-black/60 hover:text-black transition-colors relative overflow-hidden px-2 py-1 rounded"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {actionText} {item.name}
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </span>
                {isInProgress && <div className="absolute inset-0 shimmer-effect"></div>}
              </button>

              {isExpanded && item.arguments && (
                <div className="mt-2 ml-2 animate-fade-in">
                  <pre className="text-[12px] bg-black/5 rounded-lg p-3 overflow-x-auto">
                    {item.arguments}
                  </pre>
                </div>
              )}
            </div>
          );
        }

        if (item.kind === 'tool_output' && expandedTools.has(item.id.split(':')[1])) {
          return (
            <div key={item.id} className="text-left ml-2 animate-fade-in">
              <div className="text-[11px] text-black/50 mb-1">Output:</div>
              <pre className="text-[12px] bg-black/5 rounded-lg p-3 overflow-x-auto">
                {item.output}
              </pre>
            </div>
          );
        }

        if (item.kind === 'handoff') {
          return (
            <div key={item.id} className="text-left">
              <div className="inline-flex items-center gap-2 text-[13px] text-purple-600">
                {item.sourceAgent} → {item.targetAgent}
              </div>
            </div>
          );
        }

        if (item.kind === 'plan_proposal' && onApprovePlan && onRejectPlan) {
          return null;
        }

        return null;
      })}
    </div>
  );
}

