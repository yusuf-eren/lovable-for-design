'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface ResizablePanelProps {
  children: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  showRightHandle?: boolean;
}

export function ResizablePanel({
  children,
  defaultWidth = 33.33,
  minWidth = 20,
  maxWidth = 60,
  showRightHandle = true,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !panelRef.current) return;

      const containerWidth = panelRef.current.parentElement?.offsetWidth || 1;
      const deltaX = e.clientX - startXRef.current;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + deltaPercent));
      
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, minWidth, maxWidth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  return (
    <div
      ref={panelRef}
      className="relative h-full"
      style={{ width: `${width}%` }}
    >
      {children}
      {showRightHandle && (
        <div
          onMouseDown={handleMouseDown}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-black/20 transition-colors z-50 group"
        >
          <div className="absolute right-0 top-0 bottom-0 w-[4px] -translate-x-[1.5px]" />
        </div>
      )}
    </div>
  );
}

