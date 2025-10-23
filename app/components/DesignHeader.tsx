'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ExportOptions {
  format: string;
  quality: number;
  width: number;
  height: number;
}

interface DesignHeaderProps {
  onExport: (options: ExportOptions) => void;
  onSave: () => void;
  onLoadVersion: (version: number) => void;
  isDirty: boolean;
  currentVersion?: string;
  designWidth?: number;
  designHeight?: number;
}

const exportFormats = ['JPG', 'PNG', 'SVG'];
const versions = ['v1', 'v2', 'v3', 'v4', 'v5'];

export function DesignHeader({ 
  onExport,
  onSave,
  onLoadVersion,
  isDirty,
  currentVersion = 'v1',
  designWidth = 1200,
  designHeight = 675 
}: DesignHeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showVersionMenu, setShowVersionMenu] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(currentVersion);
  
  const [exportFormat, setExportFormat] = useState('jpg');
  const [quality, setQuality] = useState(1);
  const [width, setWidth] = useState(designWidth);
  const [height, setHeight] = useState(designHeight);
  
  const versionRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWidth(designWidth);
    setHeight(designHeight);
  }, [designWidth, designHeight]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (versionRef.current && !versionRef.current.contains(e.target as Node)) {
        setShowVersionMenu(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = () => {
    onExport({
      format: exportFormat,
      quality,
      width,
      height,
    });
    setShowExportMenu(false);
  };

  const handleVersionSelect = (version: string) => {
    setSelectedVersion(version);
    setShowVersionMenu(false);
    const versionNum = parseInt(version.replace('v', ''));
    onLoadVersion(versionNum);
  };

  return (
    <div className="h-[62px] border-b border-black/10 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="relative" ref={versionRef}>
          <button
            onClick={() => setShowVersionMenu(!showVersionMenu)}
            className="flex items-center gap-2 px-4 py-2 text-[14px] text-black hover:bg-black/5 rounded-[99px] transition-colors"
          >
            <span>{selectedVersion}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {showVersionMenu && (
            <div className="absolute top-full mt-2 left-0 bg-white border border-black/10 rounded-[14px] shadow-lg overflow-hidden z-50 min-w-[120px]">
              {versions.map((version) => (
                <button
                  key={version}
                  onClick={() => handleVersionSelect(version)}
                  className={`w-full text-left px-4 py-2 text-[14px] hover:bg-black/5 transition-colors ${
                    version === selectedVersion ? 'bg-black/5 font-medium' : ''
                  }`}
                >
                  {version}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={!isDirty}
          className={`flex items-center gap-2 px-4 py-2 text-[14px] rounded-[99px] transition-colors ${
            isDirty
              ? 'bg-black text-white hover:bg-black/90'
              : 'bg-black/5 text-black/40 cursor-not-allowed'
          }`}
        >
          <span>Save</span>
          {isDirty && <span className="w-2 h-2 bg-white rounded-full" />}
        </button>

        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-4 py-2 text-[14px] border border-black/10 text-black rounded-[99px] hover:bg-black/5 transition-colors"
          >
            <span>Export</span>
          </button>
        
        {showExportMenu && (
          <div className="absolute top-full mt-2 right-0 bg-white border border-black/10 rounded-[14px] shadow-lg overflow-hidden z-50 w-[280px] p-4 space-y-3">
            <div className="flex gap-2">
              {exportFormats.map((format) => (
                <button
                  key={format}
                  onClick={() => setExportFormat(format.toLowerCase())}
                  className={`flex-1 px-3 py-1.5 text-[13px] rounded-[8px] transition-colors ${
                    exportFormat === format.toLowerCase()
                      ? 'bg-black text-white'
                      : 'bg-black/5 text-black hover:bg-black/10'
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
                placeholder="Width"
                className="flex-1 min-w-0 px-3 py-1.5 text-[13px] border border-black/10 rounded-[8px] focus:outline-none focus:border-black"
              />
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                placeholder="Height"
                className="flex-1 min-w-0 px-3 py-1.5 text-[13px] border border-black/10 rounded-[8px] focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.01"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-[11px] text-black/40 text-center mt-1">
                Quality: {quality.toFixed(2)}
              </div>
            </div>

            <button
              onClick={handleExport}
              className="w-full px-4 py-2 text-[13px] bg-black text-white rounded-[8px] hover:bg-black/90 transition-colors"
            >
              Export
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

