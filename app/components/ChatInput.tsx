"use client";

import Image from "next/image";
import { Paperclip, AudioLines, ArrowUp, X, ChevronUp, ChevronDown } from "lucide-react";
import { useRef, useState } from "react";

interface DesignPlan {
  id: string;
  designType: string;
  dimensions: { width: number; height: number };
  items: Array<{ description: string; details?: string }>;
  status: 'proposed' | 'approved' | 'rejected';
}

interface ChatInputProps {
  onSendMessage: (text: string, files: File[]) => void;
  disabled?: boolean;
  dragActive: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  plan?: DesignPlan | null;
  onApprovePlan?: (planId: string) => void;
  onRejectPlan?: (planId: string) => void;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  dragActive,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  plan,
  onApprovePlan,
  onRejectPlan,
}: ChatInputProps) {
  const [inputText, setInputText] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isPlanExpanded, setIsPlanExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );
    setUploadedFiles((prev) => [...prev, ...imageFiles]);
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (!inputText.trim() && uploadedFiles.length === 0) return;
    onSendMessage(inputText, uploadedFiles);
    setInputText("");
    setUploadedFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-black/10 z-20 relative bg-white">
      {plan && (
        <>
          {plan.status === 'proposed' && (
            <div className="border-b border-black/10 bg-white">
              <button
                onClick={() => setIsPlanExpanded(!isPlanExpanded)}
                className="w-full px-6 py-3 flex items-center justify-between hover:bg-black/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  <span className="text-[14px] font-medium">
                    Plan Ready: {plan.designType} ({plan.dimensions.width}×{plan.dimensions.height})
                  </span>
                </div>
                {isPlanExpanded ? (
                  <ChevronDown className="w-4 h-4 text-black/40" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-black/40" />
                )}
              </button>

              {isPlanExpanded && (
                <div className="px-6 pb-4 space-y-3 max-h-[300px] overflow-y-auto">
                  <div className="space-y-2">
                    {plan.items.map((item, index) => (
                      <div key={index} className="flex gap-3 text-[13px]">
                        <span className="text-black/40 font-medium min-w-[24px]">{index + 1}.</span>
                        <div className="flex-1">
                          <p className="text-black/80">{item.description}</p>
                          {item.details && (
                            <p className="text-black/50 text-[12px] mt-1">{item.details}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => onApprovePlan?.(plan.id)}
                      className="flex-1 px-4 py-2 bg-black text-white text-[13px] rounded-[20px] hover:bg-black/90 transition-colors font-medium"
                    >
                      Approve Plan
                    </button>
                    <button
                      onClick={() => onRejectPlan?.(plan.id)}
                      className="flex-1 px-4 py-2 border border-black/20 text-[13px] rounded-[20px] hover:border-black/40 transition-colors font-medium"
                    >
                      Request Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {plan.status === 'approved' && (
            <div className="border-b border-black/10 bg-green-50/50">
              <div className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[14px] font-medium text-green-700">
                    Plan Approved: Executing {plan.designType}...
                  </span>
                </div>
              </div>
            </div>
          )}

          {plan.status === 'rejected' && (
            <div className="border-b border-black/10 bg-red-50/50">
              <div className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[14px] font-medium text-red-700">
                    Changes Requested
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="p-6">
        <div
          className={`border rounded-[32px] overflow-hidden ${
            dragActive ? "border-black/60 bg-black/5" : "border-black/20"
          }`}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Generate a linkedin post about ..."
          className="w-full px-6 py-4 text-[15px] resize-none outline-none bg-transparent"
          rows={2}
          disabled={disabled}
        />

        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              onClick={handleAttachClick}
              className="flex items-center gap-2 text-[14px] px-3 py-1.5 border border-black/20 rounded-[32px] hover:border-black/40 transition-colors"
              disabled={disabled}
            >
              <Paperclip className="w-4 h-4 -rotate-45" />
              Attach
            </button>

            {uploadedFiles.length > 0 && (
              <div className="flex items-center gap-2">
                {uploadedFiles.slice(0, 3).map((file, index) => (
                  <div
                    key={index}
                    className="relative w-8 h-8 rounded-full overflow-hidden border border-black/20 group"
                  >
                    <Image
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {uploadedFiles.length > 3 && (
                  <div className="w-8 h-8 rounded-full border border-black/20 flex items-center justify-center text-[11px] font-medium">
                    +{uploadedFiles.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              className="p-2 border border-black/20 rounded-[32px] hover:border-black/40 transition-colors"
              disabled={disabled}
            >
              <AudioLines className="w-4 h-4" />
            </button>
            <button
              onClick={handleSend}
              disabled={disabled}
              className="p-2 bg-black text-white border border-black rounded-[32px] hover:bg-black/90 transition-colors disabled:opacity-50"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

