'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Canvas, Rect, Circle, FabricText, FabricImage, Gradient, loadSVGFromString, util } from 'fabric';
import type { Design } from '@/app/types/design';

export interface ExportOptions {
  format: string;
  quality: number;
  width: number;
  height: number;
}

export interface DesignCanvasRef {
  exportDesign: (options: ExportOptions) => void;
  getSelectedObjectId: () => string | null;
}

interface DesignCanvasProps {
  design?: Design;
  onSelectionChange?: (operationId: string | null) => void;
}

export const DesignCanvas = forwardRef<DesignCanvasRef, DesignCanvasProps>(
  ({ design, onSelectionChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<Canvas | null>(null);

  useImperativeHandle(ref, () => ({
    getSelectedObjectId: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return null;
      const activeObject = canvas.getActiveObject();
      if (!activeObject) return null;
      return (activeObject as any).operationId || null;
    },
    exportDesign: ({ format, quality, width, height }: ExportOptions) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !design) return;

      const originalZoom = canvas.getZoom();
      canvas.setZoom(1);

      const scaleX = width / design.width;
      const scaleY = height / design.height;
      const multiplier = Math.max(scaleX, scaleY);

      if (format === 'png' || format === 'jpg') {
        const dataURL = canvas.toDataURL({
          format: format === 'jpg' ? 'jpeg' : 'png',
          quality,
          multiplier,
          width,
          height,
        });
        const link = document.createElement('a');
        link.download = `${design.name || 'design'}.${format}`;
        link.href = dataURL;
        link.click();
      } else if (format === 'svg') {
        const svg = canvas.toSVG({
          width: width.toString(),
          height: height.toString(),
          viewBox: {
            x: 0,
            y: 0,
            width: design.width,
            height: design.height,
          },
        });
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${design.name || 'design'}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }

      canvas.setZoom(originalZoom);
    },
  }));

  useEffect(() => {
    if (!canvasRef.current || !design) return;

    const canvas = new Canvas(canvasRef.current, {
      width: design.width,
      height: design.height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0];
      if (obj && onSelectionChange) {
        onSelectionChange((obj as any).operationId || null);
      }
    });

    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0];
      if (obj && onSelectionChange) {
        onSelectionChange((obj as any).operationId || null);
      }
    });

    canvas.on('selection:cleared', () => {
      if (onSelectionChange) {
        onSelectionChange(null);
      }
    });

    canvas.on('before:selection:cleared', (e) => {
      const obj = e.deselected?.[0];
      if (obj) {
        obj.set('active', false);
      }
    });

    fabricCanvasRef.current = canvas;

    return () => {
      canvas.off('selection:created');
      canvas.off('selection:updated');
      canvas.off('selection:cleared');
      canvas.off('before:selection:cleared');
      canvas.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design?.width, design?.height]);

  useEffect(() => {
    if (!fabricCanvasRef.current || !design) return;

    const canvas = fabricCanvasRef.current;
    
    const activeObject = canvas.getActiveObject();
    const selectedOperationId = activeObject ? (activeObject as any).operationId : null;

    canvas.clear();

    const sortedOperations = [...design.operations].sort((a, b) => {
      const aZ = a.zIndex ?? 0;
      const bZ = b.zIndex ?? 0;
      return aZ - bZ;
    });

    const renderOperations = async () => {
      for (const operation of sortedOperations) {
        try {
          if (operation.type === 'shape') {
            const obj = operation.object;

            if (obj.shapeType === 'rect') {
              let fillValue: string | any = obj.fill || '#000000';
              
              if (obj.gradient) {
                fillValue = new Gradient({
                  type: obj.gradient.type,
                  gradientUnits: 'pixels',
                  coords: {
                    x1: obj.gradient.coords.x1,
                    y1: obj.gradient.coords.y1,
                    x2: obj.gradient.coords.x2,
                    y2: obj.gradient.coords.y2,
                    ...(obj.gradient.type === 'radial' && {
                      r1: obj.gradient.coords.r1 ?? 0,
                      r2: obj.gradient.coords.r2 ?? 0,
                    }),
                  },
                  colorStops: obj.gradient.colorStops,
                });
              }
              
              const rect = new Rect({
                left: obj.left,
                top: obj.top,
                width: obj.width,
                height: obj.height,
                fill: fillValue,
                stroke: obj.stroke,
                strokeWidth: obj.strokeWidth,
                opacity: obj.opacity,
                angle: obj.angle,
                originX: (obj.originX || 'left') as any,
                originY: (obj.originY || 'top') as any,
                selectable: true,
                evented: true,
              });
              
              (rect as any).operationId = operation.id;
              canvas.add(rect);
            } else if (obj.shapeType === 'circle') {
              let fillValue: string | any = obj.fill || '#000000';
              
              if (obj.gradient) {
                fillValue = new Gradient({
                  type: obj.gradient.type,
                  gradientUnits: 'pixels',
                  coords: {
                    x1: obj.gradient.coords.x1,
                    y1: obj.gradient.coords.y1,
                    x2: obj.gradient.coords.x2,
                    y2: obj.gradient.coords.y2,
                    ...(obj.gradient.type === 'radial' && {
                      r1: obj.gradient.coords.r1 ?? 0,
                      r2: obj.gradient.coords.r2 ?? 0,
                    }),
                  },
                  colorStops: obj.gradient.colorStops,
                });
              }
              
              const circle = new Circle({
                left: obj.left,
                top: obj.top,
                radius: obj.radius,
                fill: fillValue,
                stroke: obj.stroke,
                strokeWidth: obj.strokeWidth,
                opacity: obj.opacity,
                angle: obj.angle,
                originX: (obj.originX || 'center') as any,
                originY: (obj.originY || 'center') as any,
                selectable: true,
                evented: true,
              });
              
              (circle as any).operationId = operation.id;
              canvas.add(circle);
            }
          } else if (operation.type === 'text') {
            const obj = operation.object;
            const text = new FabricText(obj.text, {
              left: obj.left,
              top: obj.top,
              fontSize: obj.fontSize,
              fontFamily: obj.fontFamily,
              fontWeight: obj.fontWeight,
              fill: obj.fill,
              textAlign: obj.textAlign,
              opacity: obj.opacity,
              angle: obj.angle,
              originX: (obj.originX || 'center') as any,
              originY: (obj.originY || 'center') as any,
              selectable: true,
              evented: true,
            });
            (text as any).operationId = operation.id;
            canvas.add(text);
          } else if (operation.type === 'image') {
            const obj = operation.object;
            try {
              const img = await FabricImage.fromURL(obj.src, {
                crossOrigin: 'anonymous',
              });
              img.set({
                left: obj.left,
                top: obj.top,
                opacity: obj.opacity || 1,
                angle: obj.angle || 0,
                originX: (obj.originX || 'center') as any,
                originY: (obj.originY || 'center') as any,
                selectable: true,
                evented: true,
              });
              
              if (obj.width && obj.height) {
                img.scaleToWidth(obj.width);
                img.scaleToHeight(obj.height);
              }
              
              (img as any).operationId = operation.id;
              canvas.add(img);
            } catch (error) {
              console.error('Error loading image:', obj.src, error);
            }
          } else if (operation.type === 'svg') {
            const obj = operation.object;
            try {
              const result = await loadSVGFromString(obj.svgData);
              if (result && result.objects && result.objects.length > 0) {
                const filteredObjects = result.objects.filter((o) => o !== null);
                const svgGroup = util.groupSVGElements(filteredObjects as any, result.options);
                
                svgGroup.set({
                  left: obj.left,
                  top: obj.top,
                  opacity: obj.opacity || 1,
                  angle: obj.angle || 0,
                  originX: (obj.originX || 'center') as any,
                  originY: (obj.originY || 'center') as any,
                  selectable: true,
                  evented: true,
                });
                
                if (obj.width && obj.height) {
                  svgGroup.scaleToWidth(obj.width);
                  svgGroup.scaleToHeight(obj.height);
                }
                
                if (obj.fill) {
                  svgGroup.set('fill', obj.fill);
                  (svgGroup as any).getObjects?.().forEach((item: any) => {
                    if (item.fill !== 'transparent') {
                      item.set('fill', obj.fill);
                    }
                  });
                }
                
                (svgGroup as any).operationId = operation.id;
                canvas.add(svgGroup);
              }
            } catch (error) {
              console.error('Error loading SVG:', obj.svgData, error);
            }
          }
        } catch (error) {
          console.error('Error rendering operation:', operation, error);
        }
      }

      canvas.renderAll();
      
      if (selectedOperationId) {
        const objects = canvas.getObjects();
        const objectToSelect = objects.find((obj) => (obj as any).operationId === selectedOperationId);
        if (objectToSelect) {
          canvas.setActiveObject(objectToSelect);
          canvas.renderAll();
        }
      }
    };

    renderOperations();
  }, [design]);

  if (!design) {
    return (
      <div className="flex items-center justify-center h-full bg-black/[0.02]">
        <div className="text-center text-black/40">
          <p className="text-[15px]">No design yet</p>
        </div>
      </div>
    );
  }

  const maxWidth = 900;
  const maxHeight = 700;
  const scale = Math.min(1, Math.min(maxWidth / design.width, maxHeight / design.height));

  return (
    <div className="flex items-center justify-center h-full bg-black/[0.02] p-8">
      <div 
        className="bg-white shadow-lg" 
        style={{ 
          width: design.width,
          height: design.height,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
});

DesignCanvas.displayName = 'DesignCanvas';
