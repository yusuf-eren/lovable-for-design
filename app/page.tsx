'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRunWS } from '@/app/hooks/useRunWS';
import { ChatFeed } from '@/app/components/ChatFeed';
import { ChatInput } from '@/app/components/ChatInput';
import { HeroSection } from '@/app/components/HeroSection';
import { DesignCanvas, type DesignCanvasRef, type ExportOptions } from '@/app/components/DesignCanvas';
import { DesignHeader } from '@/app/components/DesignHeader';
import { PropertiesPanel } from '@/app/components/PropertiesPanel';
import { ResizablePanel } from '@/app/components/ResizablePanel';
import type { DesignOperation } from '@/app/types/design';

function HomeContent() {
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const designCanvasRef = useRef<DesignCanvasRef>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const wsUrl = 'ws://0.0.0.0:8787';
  const { state, socket, dispatch } = useRunWS({ url: wsUrl });

  useEffect(() => {
    const lastRaw = state.raw[state.raw.length - 1];

    if (lastRaw?.type === 'streaming' && lastRaw?.data?.conversationId) {
      const chatId = lastRaw.data.conversationId;
      if (searchParams.get('chatId') !== chatId) {
        router.replace(`?chatId=${chatId}`);
      }
    }

    if (lastRaw?.type === 'raw_model_stream_event') {
      const dataType = lastRaw?.data?.type;
      if (
        dataType === 'response_started' ||
        dataType === 'output_text_delta' ||
        dataType === 'response.output_text.delta'
      ) {
        setShowThinking(false);
      }
    }

    if (lastRaw?.type === 'complete') {
      setIsProcessing(false);
      setShowThinking(false);
    }

    if (lastRaw?.type === 'design_saved') {
      setIsDirty(false);
    }
  }, [state.raw, router, searchParams]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [state.timeline, showThinking]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleSendMessage = (text: string, files: File[]) => {
    if (!text.trim() && files.length === 0) return;

    dispatch({
      type: 'local_user_message',
      text,
    });

    setIsProcessing(true);
    setShowThinking(true);

    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(
        JSON.stringify({
          kind: 'message',
          message: text,
          conversationId: state.conversationId,
        })
      );
    }
  };

  const handleNewChat = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('chatId');
    window.location.href = url.toString();
  };

  const handleExport = (options: ExportOptions) => {
    designCanvasRef.current?.exportDesign(options);
  };

  const handleUpdateOperation = (operationId: string, updates: any) => {
    if (!state.design) return;

    dispatch({
      type: 'design_update',
      data: {
        design: {
          ...state.design,
          operations: state.design.operations.map((op: DesignOperation) => {
            if (op.id === operationId) {
              if (updates.zIndex !== undefined) {
                return { ...op, zIndex: updates.zIndex };
              }
              if (op.type === 'shape' || op.type === 'text' || op.type === 'image') {
                return {
                  ...op,
                  object: {
                    ...op.object,
                    ...(updates.x !== undefined && { left: updates.x }),
                    ...(updates.y !== undefined && { top: updates.y }),
                    ...(updates.fill !== undefined && { fill: updates.fill }),
                    ...(updates.opacity !== undefined && { opacity: updates.opacity }),
                    ...(updates.rotation !== undefined && { angle: updates.rotation }),
                    ...(updates.width !== undefined && { width: updates.width }),
                    ...(updates.height !== undefined && { height: updates.height }),
                    ...(updates.radius !== undefined && { radius: updates.radius }),
                    ...(updates.text !== undefined && { text: updates.text }),
                    ...(updates.fontSize !== undefined && { fontSize: updates.fontSize }),
                    ...(updates.fontFamily !== undefined && { fontFamily: updates.fontFamily }),
                    ...(updates.fontWeight !== undefined && { fontWeight: updates.fontWeight }),
                  },
                };
              }
            }
            return op;
          }),
          updatedAt: new Date(),
        },
      },
    });
    setIsDirty(true);
  };

  const handleDeleteOperation = (operationId: string) => {
    if (!state.design) return;

    dispatch({
      type: 'design_update',
      data: {
        design: {
          ...state.design,
          operations: state.design.operations.filter((op: DesignOperation) => op.id !== operationId),
          updatedAt: new Date(),
        },
      },
    });
    setSelectedOperationId(null);
    setIsDirty(true);
  };

  const handleBringForward = (operationId: string) => {
    const operation = state.design?.operations.find((op: DesignOperation) => op.id === operationId);
    if (operation) {
      const currentZ = operation.zIndex ?? 0;
      handleUpdateOperation(operationId, { zIndex: currentZ + 1 });
    }
  };

  const handleSendBackward = (operationId: string) => {
    const operation = state.design?.operations.find((op: DesignOperation) => op.id === operationId);
    if (operation) {
      const currentZ = operation.zIndex ?? 0;
      handleUpdateOperation(operationId, { zIndex: currentZ - 1 });
    }
  };

  const handleSaveDesign = () => {
    if (socket.current?.readyState === WebSocket.OPEN && state.design) {
      socket.current.send(
        JSON.stringify({
          kind: 'save_design',
          design: state.design,
          conversationId: state.conversationId,
        })
      );
    }
  };

  const handleLoadVersion = (version: number) => {
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(
        JSON.stringify({
          kind: 'load_version',
          version,
          conversationId: state.conversationId,
        })
      );
      setIsDirty(false);
    }
  };

  const handleApprovePlan = (planId: string) => {
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(
        JSON.stringify({
          kind: 'approve_plan',
          planId,
          conversationId: state.conversationId,
        })
      );
    }
  };

  const handleRejectPlan = (planId: string, feedback?: string) => {
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(
        JSON.stringify({
          kind: 'reject_plan',
          planId,
          conversationId: state.conversationId,
          feedback: feedback || 'Plan rejected',
        })
      );
    }
  };


  const showHero = state.messages.length === 0;

  return (
    <div className="h-screen flex">
      <ResizablePanel defaultWidth={25} minWidth={20} maxWidth={40}>
        <div className="h-full border-r border-black/10 flex flex-col relative overflow-hidden">
          <div
            className={`absolute inset-0 flex items-center justify-center px-8 transition-all ease-in-out z-10 ${
              showHero
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-95 -translate-y-12 pointer-events-none'
            }`}
          >
            <HeroSection />
          </div>

          <div
            className={`flex-1 flex flex-col overflow-hidden transition-all duration-700 ease-in-out z-0 ${
              !showHero
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-8 pointer-events-none'
            }`}
          >
            <div className="flex-shrink-0 px-6 py-5 flex items-center justify-between border-b border-black/10">
              <button
                onClick={handleNewChat}
                className="text-[14px] text-black/60 hover:text-black transition-colors"
              >
                New Chat
              </button>
              <Image
                src="/arc-logo.png"
                alt="Arc AI"
                width={80}
                height={21}
                priority
              />
              <div className="w-[70px]"></div>
            </div>

            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto min-h-0 px-6 pt-6 pb-6"
            >
              <ChatFeed 
                state={state} 
                hideHandoffToolCalls={true}
                onApprovePlan={handleApprovePlan}
                onRejectPlan={handleRejectPlan}
              />

              {showThinking && (
                <div className="text-left transition-all duration-300 opacity-100 mt-4">
                  <div className="inline-block bg-black/5 rounded-[20px] px-4 py-3 text-[14px] text-black/60 relative overflow-hidden">
                    <span className="relative z-10">Thinking...</span>
                    <div className="absolute inset-0 shimmer-effect"></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isProcessing}
            dragActive={dragActive}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            plan={state.plan}
            onApprovePlan={handleApprovePlan}
            onRejectPlan={handleRejectPlan}
          />
        </div>
      </ResizablePanel>

      <ResizablePanel defaultWidth={50} minWidth={35} maxWidth={70} showRightHandle={state.design ? true : false}>
        <div className="h-full flex flex-col">
          {state.design && (
            <DesignHeader 
              onExport={handleExport}
              designWidth={state.design.width}
              designHeight={state.design.height}
              onSave={handleSaveDesign}
              onLoadVersion={handleLoadVersion}
              isDirty={isDirty}
            />
          )}
          <div className="flex-1 overflow-hidden">
            <DesignCanvas 
              ref={designCanvasRef} 
              design={state.design}
              onSelectionChange={setSelectedOperationId}
            />
          </div>
        </div>
      </ResizablePanel>

      {state.design && (
        <div className="flex-1 h-full">
          <PropertiesPanel
            selectedOperationId={selectedOperationId}
            design={state.design}
            onUpdate={handleUpdateOperation}
            onDelete={handleDeleteOperation}
            onBringForward={handleBringForward}
            onSendBackward={handleSendBackward}
          />
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-white" />}>
      <HomeContent />
    </Suspense>
  );
}
