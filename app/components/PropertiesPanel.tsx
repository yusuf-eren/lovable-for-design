'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import type { DesignOperation, Design } from '@/app/types/design';

interface PropertiesPanelProps {
  selectedOperationId: string | null;
  design: Design | undefined;
  onUpdate: (operationId: string, updates: any) => void;
  onDelete: (operationId: string) => void;
  onBringForward: (operationId: string) => void;
  onSendBackward: (operationId: string) => void;
}

export function PropertiesPanel({
  selectedOperationId,
  design,
  onUpdate,
  onDelete,
  onBringForward,
  onSendBackward,
}: PropertiesPanelProps) {
  const [localValues, setLocalValues] = useState<any>({});
  const [editingOperationId, setEditingOperationId] = useState<string | null>(null);

  const selectedOperation = useMemo(() => {
    if (!selectedOperationId || !design) return null;
    return design.operations.find((op: DesignOperation) => op.id === selectedOperationId) || null;
  }, [selectedOperationId, design]);

  useEffect(() => {
    if (selectedOperationId !== editingOperationId) {
      if (!selectedOperationId || !design) {
        setLocalValues({});
        setEditingOperationId(null);
        return;
      }

      const operation = design.operations.find((op: DesignOperation) => op.id === selectedOperationId);
      
      if (operation && (operation.type === 'shape' || operation.type === 'text' || operation.type === 'image')) {
        const obj = operation.object;
        const newValues = {
          x: obj.left,
          y: obj.top,
          fill: obj.fill,
          opacity: obj.opacity,
          rotation: obj.angle,
          ...(operation.type === 'shape' && {
            width: obj.width,
            height: obj.height,
            radius: obj.radius,
          }),
          ...(operation.type === 'text' && {
            text: obj.text,
            fontSize: obj.fontSize,
            fontFamily: obj.fontFamily,
            fontWeight: obj.fontWeight,
          }),
        };
        setLocalValues(newValues);
        setEditingOperationId(selectedOperationId);
      } else {
        setLocalValues({});
        setEditingOperationId(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOperationId]);

  const handleChange = (key: string, value: any) => {
    if (!selectedOperation) return;
    setLocalValues((prev: any) => ({ ...prev, [key]: value }));
    onUpdate(selectedOperation.id, { [key]: value });
  };

  if (!selectedOperation || (selectedOperation.type !== 'shape' && selectedOperation.type !== 'text' && selectedOperation.type !== 'image')) {
    return (
      <div className="h-full border-l border-black/10 bg-white p-6 flex items-center justify-center">
        <p className="text-[13px] text-black/40 text-center">
          Select an element to edit its properties
        </p>
      </div>
    );
  }

  const obj = selectedOperation.object;

  return (
    <div className="h-full border-l border-black/10 bg-white overflow-y-auto">
      <div className="p-4 border-b border-black/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold">
            {selectedOperation.type === 'text' ? 'Text' : 
             selectedOperation.type === 'shape' ? obj.shapeType : 'Element'}
          </h3>
          <button
            onClick={() => onDelete(selectedOperation.id)}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onBringForward(selectedOperation.id)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-[12px] bg-black/5 hover:bg-black/10 rounded-lg transition-colors"
          >
            <ChevronUp className="w-3 h-3" />
            Forward
          </button>
          <button
            onClick={() => onSendBackward(selectedOperation.id)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-[12px] bg-black/5 hover:bg-black/10 rounded-lg transition-colors"
          >
            <ChevronDown className="w-3 h-3" />
            Backward
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {selectedOperation.type === 'text' && (
          <>
            <div>
              <label className="block text-[11px] font-medium mb-1 text-black/60">Text</label>
              <textarea
                value={localValues.text || ''}
                onChange={(e) => handleChange('text', e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-black/10 rounded-lg focus:outline-none focus:border-black resize-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium mb-1 text-black/60">Font Size</label>
                <input
                  type="number"
                  value={localValues.fontSize || 16}
                  onChange={(e) => handleChange('fontSize', parseFloat(e.target.value))}
                  className="w-full px-3 py-1.5 text-[13px] border border-black/10 rounded-lg focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1 text-black/60">Weight</label>
                <select
                  value={localValues.fontWeight || 'normal'}
                  onChange={(e) => {
                    handleChange('fontWeight', e.target.value);
                  }}
                  className="w-full px-3 py-1.5 text-[13px] border border-black/10 rounded-lg focus:outline-none focus:border-black"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                  <option value="400">400</option>
                  <option value="600">600</option>
                  <option value="700">700</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium mb-1 text-black/60">Font Family</label>
              <input
                type="text"
                value={localValues.fontFamily || 'Arial'}
                onChange={(e) => handleChange('fontFamily', e.target.value)}
                className="w-full px-3 py-1.5 text-[13px] border border-black/10 rounded-lg focus:outline-none focus:border-black"
              />
            </div>
          </>
        )}

        {selectedOperation.type === 'shape' && obj.shapeType === 'rect' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium mb-1 text-black/60">Width</label>
              <input
                type="number"
                value={localValues.width || 0}
                onChange={(e) => handleChange('width', parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 text-[13px] border border-black/10 rounded-lg focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1 text-black/60">Height</label>
              <input
                type="number"
                value={localValues.height || 0}
                onChange={(e) => handleChange('height', parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 text-[13px] border border-black/10 rounded-lg focus:outline-none focus:border-black"
              />
            </div>
          </div>
        )}

        {selectedOperation.type === 'shape' && obj.shapeType === 'circle' && (
          <div>
            <label className="block text-[11px] font-medium mb-1 text-black/60">Radius</label>
            <input
              type="number"
              value={localValues.radius || 0}
              onChange={(e) => handleChange('radius', parseFloat(e.target.value))}
              className="w-full px-3 py-1.5 text-[13px] border border-black/10 rounded-lg focus:outline-none focus:border-black"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium mb-1 text-black/60">X</label>
            <input
              type="number"
              value={localValues.x || 0}
              onChange={(e) => handleChange('x', parseFloat(e.target.value))}
              className="w-full px-3 py-1.5 text-[13px] border border-black/10 rounded-lg focus:outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-1 text-black/60">Y</label>
            <input
              type="number"
              value={localValues.y || 0}
              onChange={(e) => handleChange('y', parseFloat(e.target.value))}
              className="w-full px-3 py-1.5 text-[13px] border border-black/10 rounded-lg focus:outline-none focus:border-black"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium mb-1 text-black/60">Fill Color</label>
          <div className="flex gap-2 mb-2">
            <input
              type="color"
              value={localValues.fill || '#000000'}
              onChange={(e) => {
                handleChange('fill', e.target.value);
              }}
              className="w-12 h-9 border border-black/10 rounded-lg cursor-pointer"
            />
            <input
              type="text"
              value={localValues.fill || '#000000'}
              onChange={(e) => handleChange('fill', e.target.value)}
              className="flex-1 px-3 py-1.5 text-[13px] border border-black/10 rounded-lg focus:outline-none focus:border-black font-mono"
            />
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {['#000000', '#FFFFFF', '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', 
              '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
              '#D946EF', '#EC4899', '#F43F5E', '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0', '#F1F5F9'].map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleChange('fill', color)}
                className="w-7 h-7 rounded-md border-2 transition-all hover:scale-110"
                style={{ 
                  backgroundColor: color,
                  borderColor: localValues.fill === color ? '#000' : color === '#FFFFFF' ? '#E5E7EB' : color
                }}
                title={color}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium mb-1 text-black/60">
            Opacity: {(localValues.opacity || 1).toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={localValues.opacity || 1}
            onChange={(e) => {
              handleChange('opacity', parseFloat(e.target.value));
            }}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium mb-1 text-black/60">
            Rotation: {(localValues.rotation || 0).toFixed(0)}°
          </label>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={localValues.rotation || 0}
            onChange={(e) => {
              handleChange('rotation', parseFloat(e.target.value));
            }}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

