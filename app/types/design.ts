export type GradientColorStop = {
  offset: number;
  color: string;
};

export type GradientConfig = {
  type: 'linear' | 'radial';
  coords: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    r1?: number | null;
    r2?: number | null;
  };
  colorStops: GradientColorStop[];
};

export type FabricObjectJSON = {
  type: string;
  version?: string;
  originX?: string;
  originY?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  fill?: string;
  gradient?: GradientConfig;
  stroke?: string;
  strokeWidth?: number;
  strokeDashArray?: number[];
  strokeLineCap?: string;
  strokeLineJoin?: string;
  strokeMiterLimit?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  flipX?: boolean;
  flipY?: boolean;
  opacity?: number;
  shadow?: any;
  visible?: boolean;
  backgroundColor?: string;
  fillRule?: string;
  paintFirst?: string;
  globalCompositeOperation?: string;
  skewX?: number;
  skewY?: number;
  [key: string]: any;
};

export type DrawOperation = {
  id: string;
  type: 'draw';
  objects: FabricObjectJSON[];
  zIndex?: number;
  createdAt: Date;
};

export type EraseOperation = {
  id: string;
  type: 'erase';
  objectIds: string[];
  zIndex?: number;
  createdAt: Date;
};

export type FillOperation = {
  id: string;
  type: 'fill';
  objectId: string;
  fill: string;
  zIndex?: number;
  createdAt: Date;
};

export type TextOperation = {
  id: string;
  type: 'text';
  object: FabricObjectJSON & {
    text: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    fontStyle?: string;
    textAlign?: string;
    underline?: boolean;
    linethrough?: boolean;
  };
  zIndex?: number;
  createdAt: Date;
};

export type ShapeOperation = {
  id: string;
  type: 'shape';
  object: FabricObjectJSON & {
    shapeType: 'rect' | 'circle' | 'triangle' | 'polygon' | 'ellipse' | 'line';
    radius?: number;
    rx?: number;
    ry?: number;
    points?: { x: number; y: number }[];
  };
  zIndex?: number;
  createdAt: Date;
};

export type ImageOperation = {
  id: string;
  type: 'image';
  object: FabricObjectJSON & {
    src: string;
    crossOrigin?: string | null;
    filters?: any[];
  };
  zIndex?: number;
  createdAt: Date;
};

export type SVGOperation = {
  id: string;
  type: 'svg';
  object: FabricObjectJSON & {
    svgData: string;
    scaleX?: number;
    scaleY?: number;
  };
  zIndex?: number;
  createdAt: Date;
};

export type DesignOperation = 
  | DrawOperation 
  | EraseOperation 
  | FillOperation 
  | TextOperation 
  | ShapeOperation 
  | ImageOperation
  | SVGOperation;

export type Design = {
  id: string;
  name: string;
  width: number;
  height: number;
  operations: DesignOperation[];
  fabricJSON?: {
    version: string;
    objects: FabricObjectJSON[];
  };
  createdAt: Date;
  updatedAt: Date;
};

export type DesignPlanItem = {
  description: string;
  details?: string;
};

export type DesignPlan = {
  id: string;
  designType: string;
  dimensions: {
    width: number;
    height: number;
  };
  items: DesignPlanItem[];
  status: 'proposed' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
};

