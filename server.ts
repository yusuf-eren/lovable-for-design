import 'dotenv/config';
import { WebSocketServer } from 'ws';
import {
  Agent,
  // handoff,
  tool,
  Runner,
  RunState,
  type RunToolApprovalItem,
} from '@openai/agents';
import z from 'zod';
import { aisdk } from '@openai/agents-extensions';
// import { openai } from '@ai-sdk/openai';
import type { Design, DesignOperation, ShapeOperation, TextOperation, ImageOperation, SVGOperation, DesignPlan } from './app/types/design';
import { anthropic } from '@ai-sdk/anthropic';

// const model = aisdk(openai('gpt-5'));
const model = aisdk(anthropic('claude-sonnet-4-5'));

const setCanvasSizeTool = tool({
  name: 'set-canvas-size',
  description: 'Set the canvas dimensions for the design. This should be called FIRST before adding any elements.',
  execute: async ({ width, height, name }) => {
    if (!currentConversationId) {
      return {
        success: false,
        message: 'No active conversation',
      };
    }

    const design = getOrCreateDesign(currentConversationId);
    design.width = width;
    design.height = height;
    if (name) design.name = name;
    design.updatedAt = new Date();
    conversationDesigns.set(currentConversationId, design);

    if (currentWebSocket) {
      safeSend(currentWebSocket, {
        type: 'design_update',
        data: {
          conversationId: currentConversationId,
          design,
        },
      });
    }

    return {
      success: true,
      design,
      message: `Canvas set to ${width}x${height}${name ? ` - "${name}"` : ''}`,
    };
  },
  parameters: z.object({
    width: z.number().describe('Canvas width in pixels'),
    height: z.number().describe('Canvas height in pixels'),
    name: z.string().optional().nullable().describe('Optional name for the design'),
  }),
});

const addRectangleTool = tool({
  name: 'add-rectangle',
  description: 'Add a rectangle shape to the design canvas. Can use solid fill or gradient fill.',
  execute: async ({ x, y, width, height, fill, gradient, stroke, strokeWidth, opacity, rotation, originX, originY, zIndex }) => {
    const operation: ShapeOperation = {
      id: genId(),
      type: 'shape',
      object: {
        type: 'rect',
        shapeType: 'rect',
        left: x,
        top: y,
        width,
        height,
        fill: fill || '#000000',
        gradient: gradient ? {
          type: gradient.type,
          coords: {
            x1: gradient.coords.x1,
            y1: gradient.coords.y1,
            x2: gradient.coords.x2,
            y2: gradient.coords.y2,
            r1: gradient.coords.r1 ?? undefined,
            r2: gradient.coords.r2 ?? undefined,
          },
          colorStops: gradient.colorStops,
        } : undefined,
        stroke: stroke || undefined,
        strokeWidth: strokeWidth || 0,
        opacity: opacity || 1,
        angle: rotation || 0,
        originX: originX || 'left',
        originY: originY || 'top',
      },
      zIndex: zIndex || 0,
      createdAt: new Date(),
    };

    if (currentConversationId) {
      const design = addOperationToDesign(currentConversationId, operation);
      return {
        success: true,
        operationId: operation.id,
        operation,
        design,
        message: `Added rectangle with ID ${operation.id} at (${x}, ${y})`,
      };
    }

    return {
      success: true,
      operationId: operation.id,
      operation,
      message: `Added rectangle with ID ${operation.id} at (${x}, ${y})`,
    };
  },
  parameters: z.object({
    x: z.number().describe('X position on canvas'),
    y: z.number().describe('Y position on canvas'),
    width: z.number().describe('Width of the rectangle'),
    height: z.number().describe('Height of the rectangle'),
    fill: z.string().optional().nullable().describe('Fill color (hex format like #FF0000). Use either fill OR gradient, not both.'),
    gradient: z.object({
      type: z.enum(['linear', 'radial']).describe('Gradient type: linear or radial'),
      coords: z.object({
        x1: z.number().describe('Start X coordinate (relative to shape, e.g., -width/2 for left edge)'),
        y1: z.number().describe('Start Y coordinate (relative to shape, e.g., -height/2 for top edge)'),
        x2: z.number().describe('End X coordinate (relative to shape, e.g., width/2 for right edge)'),
        y2: z.number().describe('End Y coordinate (relative to shape, e.g., height/2 for bottom edge)'),
        r1: z.number().optional().nullable().describe('Start radius for radial gradient'),
        r2: z.number().optional().nullable().describe('End radius for radial gradient'),
      }).describe('Gradient coordinates relative to the shape center'),
      colorStops: z.array(z.object({
        offset: z.number().describe('Position from 0 to 1'),
        color: z.string().describe('Color at this position (hex format)'),
      })).describe('Color stops array, e.g., [{offset: 0, color: "#FF0000"}, {offset: 1, color: "#0000FF"}]'),
    }).optional().nullable().describe('Gradient fill configuration. Use either fill OR gradient, not both.'),
    stroke: z.string().optional().nullable().describe('Stroke color'),
    strokeWidth: z.number().optional().nullable().describe('Stroke width'),
    opacity: z.number().optional().nullable().describe('Opacity between 0 and 1'),
    rotation: z.number().optional().nullable().describe('Rotation angle in degrees'),
    originX: z.enum(['left', 'center', 'right']).optional().nullable().describe('Horizontal origin point for positioning. "left" means x,y refers to the left edge, "center" means x,y refers to the center, "right" means x,y refers to the right edge. Default: "left"'),
    originY: z.enum(['top', 'center', 'bottom']).optional().nullable().describe('Vertical origin point for positioning. "top" means x,y refers to the top edge, "center" means x,y refers to the center, "bottom" means x,y refers to the bottom edge. Default: "top"'),
    zIndex: z.number().optional().nullable().describe('Layer order (higher values appear on top). Default: 0'),
  }),
});

const addCircleTool = tool({
  name: 'add-circle',
  description: 'Add a circle shape to the design canvas. Can use solid fill or gradient fill.',
  execute: async ({ x, y, radius, fill, gradient, stroke, strokeWidth, opacity, rotation, originX, originY, zIndex }) => {
    const operation: ShapeOperation = {
      id: genId(),
      type: 'shape',
      object: {
        type: 'circle',
        shapeType: 'circle',
        left: x,
        top: y,
        radius,
        fill: fill || '#000000',
        gradient: gradient ? {
          type: gradient.type,
          coords: {
            x1: gradient.coords.x1,
            y1: gradient.coords.y1,
            x2: gradient.coords.x2,
            y2: gradient.coords.y2,
            r1: gradient.coords.r1 ?? undefined,
            r2: gradient.coords.r2 ?? undefined,
          },
          colorStops: gradient.colorStops,
        } : undefined,
        stroke: stroke || undefined,
        strokeWidth: strokeWidth || 0,
        opacity: opacity || 1,
        angle: rotation || 0,
        originX: originX || 'center',
        originY: originY || 'center',
      },
      zIndex: zIndex || 0,
      createdAt: new Date(),
    };

    if (currentConversationId) {
      const design = addOperationToDesign(currentConversationId, operation);
      return {
        success: true,
        operationId: operation.id,
        operation,
        design,
        message: `Added circle with ID ${operation.id} at (${x}, ${y})`,
      };
    }

    return {
      success: true,
      operationId: operation.id,
      operation,
      message: `Added circle with ID ${operation.id} at (${x}, ${y})`,
    };
  },
  parameters: z.object({
    x: z.number().describe('X position on canvas'),
    y: z.number().describe('Y position on canvas'),
    radius: z.number().describe('Radius of the circle'),
    fill: z.string().optional().nullable().describe('Fill color (hex format like #FF0000). Use either fill OR gradient, not both.'),
    gradient: z.object({
      type: z.enum(['linear', 'radial']).describe('Gradient type: linear or radial'),
      coords: z.object({
        x1: z.number().describe('Start X coordinate (relative to shape center)'),
        y1: z.number().describe('Start Y coordinate (relative to shape center)'),
        x2: z.number().describe('End X coordinate (relative to shape center)'),
        y2: z.number().describe('End Y coordinate (relative to shape center)'),
        r1: z.number().optional().nullable().describe('Start radius for radial gradient'),
        r2: z.number().optional().nullable().describe('End radius for radial gradient'),
      }).describe('Gradient coordinates relative to the shape center'),
      colorStops: z.array(z.object({
        offset: z.number().describe('Position from 0 to 1'),
        color: z.string().describe('Color at this position (hex format)'),
      })).describe('Color stops array, e.g., [{offset: 0, color: "#FF0000"}, {offset: 1, color: "#0000FF"}]'),
    }).optional().nullable().describe('Gradient fill configuration. Use either fill OR gradient, not both.'),
    stroke: z.string().optional().nullable().describe('Stroke color'),
    strokeWidth: z.number().optional().nullable().describe('Stroke width'),
    opacity: z.number().optional().nullable().describe('Opacity between 0 and 1'),
    rotation: z.number().optional().nullable().describe('Rotation angle in degrees'),
    originX: z.enum(['left', 'center', 'right']).optional().nullable().describe('Horizontal origin point for positioning. "left" means x,y refers to the left edge, "center" means x,y refers to the center, "right" means x,y refers to the right edge. Default: "center"'),
    originY: z.enum(['top', 'center', 'bottom']).optional().nullable().describe('Vertical origin point for positioning. "top" means x,y refers to the top edge, "center" means x,y refers to the center, "bottom" means x,y refers to the bottom edge. Default: "center"'),
    zIndex: z.number().optional().nullable().describe('Layer order (higher values appear on top). Default: 0'),
  }),
});

const addTextTool = tool({
  name: 'add-text',
  description: 'Add text to the design canvas',
  execute: async ({ x, y, text, fontSize, fontFamily, fontWeight, fill, textAlign, opacity, rotation, originX, originY, zIndex }) => {
    const operation: TextOperation = {
      id: genId(),
      type: 'text',
      object: {
        type: 'text',
        text,
        left: x,
        top: y,
        fontSize: fontSize || 16,
        fontFamily: fontFamily || 'Arial',
        fontWeight: fontWeight || 'normal',
        fill: fill || '#000000',
        textAlign: textAlign || 'left',
        opacity: opacity || 1,
        angle: rotation || 0,
        originX: originX || 'center',
        originY: originY || 'center',
      },
      zIndex: zIndex || 0,
      createdAt: new Date(),
    };

    if (currentConversationId) {
      const design = addOperationToDesign(currentConversationId, operation);
      return {
        success: true,
        operationId: operation.id,
        operation,
        design,
        message: `Added text with ID ${operation.id}: "${text}" at (${x}, ${y})`,
      };
    }

    return {
      success: true,
      operationId: operation.id,
      operation,
      message: `Added text with ID ${operation.id}: "${text}" at (${x}, ${y})`,
    };
  },
  parameters: z.object({
    x: z.number().describe('X position on canvas'),
    y: z.number().describe('Y position on canvas'),
    text: z.string().describe('Text content'),
    fontSize: z.number().optional().nullable().describe('Font size'),
    fontFamily: z.string().optional().nullable().describe('Font family'),
    fontWeight: z.string().optional().nullable().describe('Font weight (normal, bold, 400, 600, etc)'),
    fill: z.string().optional().nullable().describe('Text color (hex format like #FF0000)'),
    textAlign: z.string().optional().nullable().describe('Text alignment (left, center, right)'),
    opacity: z.number().optional().nullable().describe('Opacity between 0 and 1'),
    rotation: z.number().optional().nullable().describe('Rotation angle in degrees'),
    originX: z.enum(['left', 'center', 'right']).optional().nullable().describe('Horizontal origin point for positioning. "left" means x,y refers to the left edge, "center" means x,y refers to the center, "right" means x,y refers to the right edge. Default: "center"'),
    originY: z.enum(['top', 'center', 'bottom']).optional().nullable().describe('Vertical origin point for positioning. "top" means x,y refers to the top edge, "center" means x,y refers to the center, "bottom" means x,y refers to the bottom edge. Default: "center"'),
    zIndex: z.number().optional().nullable().describe('Layer order (higher values appear on top). Default: 0'),
  }),
});

const addImageTool = tool({
  name: 'add-image',
  description: 'Add an image to the design canvas',
  execute: async ({ x, y, src, width, height, opacity, rotation, originX, originY, zIndex }) => {
    const operation: ImageOperation = {
      id: genId(),
      type: 'image',
      object: {
        type: 'image',
        src,
        left: x,
        top: y,
        width: width || 200,
        height: height || 200,
        opacity: opacity || 1,
        angle: rotation || 0,
        originX: originX || 'center',
        originY: originY || 'center',
      },
      zIndex: zIndex ?? 0,
      createdAt: new Date(),
    };

    if (currentConversationId) {
      const design = addOperationToDesign(currentConversationId, operation);
      return {
        success: true,
        operationId: operation.id,
        operation,
        design,
        message: `Added image with ID ${operation.id} from ${src} at (${x}, ${y})`,
      };
    }

    return {
      success: true,
      operationId: operation.id,
      operation,
      message: `Added image with ID ${operation.id} from ${src} at (${x}, ${y})`,
    };
  },
  parameters: z.object({
    x: z.number().describe('X position on canvas'),
    y: z.number().describe('Y position on canvas'),
    src: z.string().describe('Image URL or path (e.g., /elevenlabs-logo-black.svg)'),
    width: z.number().optional().nullable().describe('Width of the image in pixels'),
    height: z.number().optional().nullable().describe('Height of the image in pixels'),
    opacity: z.number().optional().nullable().describe('Opacity between 0 and 1. Default: 1'),
    rotation: z.number().optional().nullable().describe('Rotation angle in degrees. Default: 0'),
    originX: z.enum(['left', 'center', 'right']).optional().nullable().describe('Horizontal origin point for positioning. "left" means x,y refers to the left edge, "center" means x,y refers to the center, "right" means x,y refers to the right edge. For logos/images use "left". Default: "center"'),
    originY: z.enum(['top', 'center', 'bottom']).optional().nullable().describe('Vertical origin point for positioning. "top" means x,y refers to the top edge, "center" means x,y refers to the center, "bottom" means x,y refers to the bottom edge. For logos/images use "top". Default: "center"'),
    zIndex: z.number().optional().nullable().describe('Layer order (higher values appear on top). Images/logos should use 20-30. Default: 0'),
  }),
});

const addSVGTool = tool({
  name: 'add-svg',
  description: 'Add an SVG icon or graphic to the design canvas. Use this for icons (calendar, check, arrow, etc.) instead of images. Provide inline SVG markup.',
  execute: async ({ x, y, svgData, width, height, fill, opacity, rotation, originX, originY, zIndex }) => {
    const operation: SVGOperation = {
      id: genId(),
      type: 'svg',
      object: {
        type: 'svg',
        svgData,
        left: x,
        top: y,
        width: width || 24,
        height: height || 24,
        fill: fill || undefined,
        opacity: opacity || 1,
        angle: rotation || 0,
        originX: originX || 'center',
        originY: originY || 'center',
        scaleX: 1,
        scaleY: 1,
      },
      zIndex: zIndex ?? 0,
      createdAt: new Date(),
    };

    if (currentConversationId) {
      const design = addOperationToDesign(currentConversationId, operation);
      return {
        success: true,
        operationId: operation.id,
        operation,
        design,
        message: `Added SVG with ID ${operation.id} at (${x}, ${y})`,
      };
    }

    return {
      success: true,
      operationId: operation.id,
      operation,
      message: `Added SVG with ID ${operation.id} at (${x}, ${y})`,
    };
  },
  parameters: z.object({
    x: z.number().describe('X position on canvas'),
    y: z.number().describe('Y position on canvas'),
    svgData: z.string().describe('Inline SVG markup string (e.g., "<svg viewBox=\'0 0 24 24\'><path d=\'M8 2v2H4v2h1l1 14h12l1-14h1V4h-4V2H8zm2 2h4v2h-4V4z\'/></svg>"). Must include <svg> tags with viewBox.'),
    width: z.number().optional().nullable().describe('Width in pixels. Default: 24'),
    height: z.number().optional().nullable().describe('Height in pixels. Default: 24'),
    fill: z.string().optional().nullable().describe('Fill color for the SVG (hex format like #000000). If not provided, SVG uses its own colors.'),
    opacity: z.number().optional().nullable().describe('Opacity between 0 and 1. Default: 1'),
    rotation: z.number().optional().nullable().describe('Rotation angle in degrees. Default: 0'),
    originX: z.enum(['left', 'center', 'right']).optional().nullable().describe('Horizontal origin point. Default: "center"'),
    originY: z.enum(['top', 'center', 'bottom']).optional().nullable().describe('Vertical origin point. Default: "center"'),
    zIndex: z.number().optional().nullable().describe('Layer order (higher values appear on top). Icons should use 25-35. Default: 0'),
  }),
});

const removeOperationTool = tool({
  name: 'remove-operation',
  description: 'Remove an operation from the design by its ID',
  execute: async ({ operationId }) => {
    if (!currentConversationId) {
      return {
        success: false,
        message: 'No active conversation',
      };
    }

    const design = conversationDesigns.get(currentConversationId);
    if (!design) {
      return {
        success: false,
        message: 'No design found',
      };
    }

    const initialLength = design.operations.length;
    design.operations = design.operations.filter(op => op.id !== operationId);
    
    if (design.operations.length === initialLength) {
      return {
        success: false,
        message: `Operation with ID ${operationId} not found`,
      };
    }

    design.updatedAt = new Date();
    conversationDesigns.set(currentConversationId, design);

    if (currentWebSocket) {
      safeSend(currentWebSocket, {
        type: 'design_update',
        data: {
          conversationId: currentConversationId,
          design,
        },
      });
    }

    return {
      success: true,
      design,
      message: `Removed operation ${operationId}`,
    };
  },
  parameters: z.object({
    operationId: z.string().describe('ID of the operation to remove'),
  }),
});

const updateOperationTool = tool({
  name: 'update-operation',
  description: 'Update an existing operation by its ID. Provide the properties you want to change.',
  execute: async ({ operationId, x, y, width, height, radius, fill, stroke, strokeWidth, opacity, rotation, text, fontSize, fontFamily, originX, originY, zIndex }) => {
    if (!currentConversationId) {
      return {
        success: false,
        message: 'No active conversation',
      };
    }

    const design = conversationDesigns.get(currentConversationId);
    if (!design) {
      return {
        success: false,
        message: 'No design found',
      };
    }

    const opIndex = design.operations.findIndex(op => op.id === operationId);
    if (opIndex === -1) {
      return {
        success: false,
        message: `Operation with ID ${operationId} not found`,
      };
    }

    const operation = design.operations[opIndex];
    
    if (zIndex !== null && zIndex !== undefined) {
      operation.zIndex = zIndex;
    }
    
    if (operation.type === 'shape' || operation.type === 'text' || operation.type === 'image') {
      if (x !== null && x !== undefined) operation.object.left = x;
      if (y !== null && y !== undefined) operation.object.top = y;
      if (fill !== null && fill !== undefined) operation.object.fill = fill;
      if (stroke !== null && stroke !== undefined) operation.object.stroke = stroke;
      if (strokeWidth !== null && strokeWidth !== undefined) operation.object.strokeWidth = strokeWidth;
      if (opacity !== null && opacity !== undefined) operation.object.opacity = opacity;
      if (rotation !== null && rotation !== undefined) operation.object.angle = rotation;
      if (originX !== null && originX !== undefined) operation.object.originX = originX;
      if (originY !== null && originY !== undefined) operation.object.originY = originY;
    }

    if (operation.type === 'shape') {
      if (width !== null && width !== undefined) operation.object.width = width;
      if (height !== null && height !== undefined) operation.object.height = height;
      if (radius !== null && radius !== undefined) operation.object.radius = radius;
    }

    if (operation.type === 'text') {
      if (text !== null && text !== undefined) operation.object.text = text;
      if (fontSize !== null && fontSize !== undefined) operation.object.fontSize = fontSize;
      if (fontFamily !== null && fontFamily !== undefined) operation.object.fontFamily = fontFamily;
    }

    if (operation.type === 'image') {
      if (width !== null && width !== undefined) operation.object.width = width;
      if (height !== null && height !== undefined) operation.object.height = height;
    }

    design.operations[opIndex] = operation;
    design.updatedAt = new Date();
    conversationDesigns.set(currentConversationId, design);

    if (currentWebSocket) {
      safeSend(currentWebSocket, {
        type: 'design_update',
        data: {
          conversationId: currentConversationId,
          design,
        },
      });
    }

    return {
      success: true,
      operation,
      design,
      message: `Updated operation ${operationId}`,
    };
  },
  parameters: z.object({
    operationId: z.string().describe('ID of the operation to update'),
    x: z.number().optional().nullable().describe('New X position'),
    y: z.number().optional().nullable().describe('New Y position'),
    width: z.number().optional().nullable().describe('New width'),
    height: z.number().optional().nullable().describe('New height'),
    radius: z.number().optional().nullable().describe('New radius (for circles)'),
    fill: z.string().optional().nullable().describe('New fill color'),
    stroke: z.string().optional().nullable().describe('New stroke color'),
    strokeWidth: z.number().optional().nullable().describe('New stroke width'),
    opacity: z.number().optional().nullable().describe('New opacity'),
    rotation: z.number().optional().nullable().describe('New rotation angle'),
    text: z.string().optional().nullable().describe('New text content (for text elements)'),
    fontSize: z.number().optional().nullable().describe('New font size (for text elements)'),
    fontFamily: z.string().optional().nullable().describe('New font family (for text elements)'),
    originX: z.enum(['left', 'center', 'right']).optional().nullable().describe('Horizontal origin point for positioning. "left" means x,y refers to the left edge, "center" means x,y refers to the center, "right" means x,y refers to the right edge'),
    originY: z.enum(['top', 'center', 'bottom']).optional().nullable().describe('Vertical origin point for positioning. "top" means x,y refers to the top edge, "center" means x,y refers to the center, "bottom" means x,y refers to the bottom edge'),
    zIndex: z.number().optional().nullable().describe('New layer order (higher values appear on top)'),
  }),
});

const planningAgent = new Agent({
  name: 'planning-agent',
  instructions: `You are a Design Planning Specialist. Your ONLY job is to analyze design requests and create detailed, actionable plans.

RESPONSIBILITIES:
1. Analyze user requests (even vague ones like "instagram post about 20% off halloween")
2. Determine the appropriate design type and canvas dimensions
3. Create a comprehensive, step-by-step execution plan
4. Return a structured plan with all necessary details

PLANNING PROCESS:
1. Identify design type:
   - LinkedIn Post (1200x627)
   - Instagram Post (1080x1080)
   - Instagram Story (1080x1920)
   - Facebook Post (1200x628)
   - Twitter Post (1200x675)
   - Banner Ad (728x90)
   - Other custom sizes as needed

2. Break down the design into ordered steps:
   - Canvas setup
   - Background elements (solid fills, gradients, shapes)
   - Images and logos
   - SVG icons (calendar, star, gift, etc.) - NEVER use emojis!
   - Text elements (headlines, body text, CTAs)
   - Any decorative elements

3. For EACH step, provide:
   - Clear description of what to add
   - Specific details (colors, sizes, positions, text content)
   - For icons: specify which SVG icon to use (e.g., "calendar icon", "star icon")

4. Consider ElevenLabs brand guidelines:
   - Use Inter font family
   - Primary colors: White (#FFFFFF), Black (#000000)
   - Secondary colors: Purple P50-P950, Magenta M50-M950
   - Logo files: /elevenlabs-logo-black.svg, /elevenlabs-logo-white.svg
   - Use SVG icons from Lucide React, NOT emojis
   - Proper spacing and hierarchy

EXAMPLE PLAN FOR "Instagram post about 20% off halloween":
- Design Type: "Instagram Post"
- Dimensions: 1080 x 1080
- Items:
  1. "Set canvas size to 1080x1080 pixels"
  2. "Add white background rectangle (#FFFFFF) covering entire canvas"
  3. "Add purple gradient background shape (P500 to P600) as decorative element in top-right corner"
  4. "Add ElevenLabs logo (black SVG) at top center, 200px wide"
  5. "Add gift icon (SVG) in purple next to headline, 40px size"
  6. "Add main headline '20% OFF' in Inter Bold, 96px, Black, centered at position (540, 400)"
  7. "Add subheading 'Halloween Special' in Inter Regular, 48px, Purple P500, centered below headline"
  8. "Add calendar icon (SVG) next to deadline text, 24px, black"
  9. "Add body text 'Limited time offer. Use code HALLOWEEN20' in Inter Regular, 32px, N700, centered at position (540, 700)"
  10. "Add CTA button background rectangle (Black, 300x80) at bottom center"
  11. "Add CTA button text 'Shop Now' in Inter Medium, 36px, White, centered on button"

OUTPUT FORMAT:
Return a structured response with:
- designType: string (clear, descriptive name)
- width: number (canvas width in pixels)
- height: number (canvas height in pixels)
- items: array of objects, each with:
  - description: string (what will be done)
  - details: string (additional specifics like colors, sizes, exact text)

REMEMBER: You only plan. You do NOT execute. The design agent will execute your plan after user approval.`,
  tools: [
    tool({
      name: 'create-plan',
      description: 'Create and submit the design plan for user approval',
      execute: async ({ designType, width, height, items }) => {
        if (!currentConversationId || !currentWebSocket) {
          return {
            success: false,
            message: 'No active conversation or websocket',
          };
        }

        const plan: DesignPlan = {
          id: genId(),
          designType,
          dimensions: { width, height },
          items: items.map((item) => ({
            description: item.description,
            ...(item.details && { details: item.details }),
          })),
          status: 'proposed',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        conversationPlans.set(currentConversationId, plan);

        safeSend(currentWebSocket, {
          type: 'plan_proposal',
          data: {
            conversationId: currentConversationId,
            plan,
          },
        });

        return {
          success: true,
          planId: plan.id,
          message: `Plan proposed with ${items.length} items. Waiting for user approval.`,
        };
      },
      parameters: z.object({
        designType: z.string().describe('Type of design (e.g., "Instagram Post", "LinkedIn Post", "Halloween Sale Ad")'),
        width: z.number().describe('Canvas width in pixels'),
        height: z.number().describe('Canvas height in pixels'),
        items: z.array(z.object({
          description: z.string().describe('Clear description of what will be done (e.g., "Add ElevenLabs logo at top center")'),
          details: z.string().optional().nullable().describe('Additional details like colors, sizes, positions'),
        })).describe('Ordered list of all steps that will be executed'),
      }),
    }),
  ],
  model,
});

// ----- Agents -----
const designAgent = new Agent({
  name: 'design-agent',
  instructions: `You are the ElevenLabs Brand Design and Writing Assistant. You produce UI, visuals, and copy that follow ElevenLabs brand standards precisely.

=== WORKFLOW ===
STEP 1: PLANNING (ALWAYS DO THIS FIRST)
- When you receive ANY design request, IMMEDIATELY call the planning-agent tool
- The planning agent will analyze the request and create a detailed, actionable plan
- Even if the request is vague (e.g., "instagram post about 20% off halloween"), the planning agent will:
  * Determine the best design type and dimensions
  * Define ALL visual elements (backgrounds, images, text, colors)
  * Specify exact text content with proper branding
  * List every single step in a structured plan
- Pass the user's design request to the planning agent exactly as received
- DO NOT execute anything yet - wait for user approval
- The plan will be presented to the user automatically

STEP 2: WAIT FOR APPROVAL
- After the planning agent proposes the plan, STOP and wait
- Tell the user to review and approve the plan
- Do NOT call any design tools until you receive approval

STEP 3: EXECUTION (Only after user approves)
- Once approved, you will receive the full plan details
- Execute the plan step by step in the exact order specified:
  1. Call set-canvas-size first
  2. Call add-rectangle, add-circle, add-text, add-svg, add-image tools as specified in the plan
  3. Follow the plan exactly as proposed
  4. Maintain proper zIndex layering (backgrounds → shapes → images/SVGs → text)
- Report progress as you execute each step

=== SVG ICONS (USE INSTEAD OF EMOJIS!) ===

ALWAYS use the add-svg tool for icons and decorative graphics. NEVER use emoji characters. SVG icons are:
- Scalable and crisp at any size
- Easy to recolor to match brand colors
- More professional than emojis

COMMON LUCIDE REACT ICONS (copy these exact SVG strings):

Calendar Icon:
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>

Check Icon:
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>

X (Close) Icon:
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>

Arrow Right Icon:
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>

Star Icon:
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>

Heart Icon:
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>

Gift Icon:
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line x1="12" x2="12" y1="22" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>

Shopping Cart Icon:
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>

Tag/Sale Icon:
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>

Sparkles Icon:
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>

USAGE EXAMPLES:

Add a calendar icon (24x24) next to a date:
add-svg:
{
  "x": 100,
  "y": 200,
  "svgData": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" ry=\"2\"/><line x1=\"16\" x2=\"16\" y1=\"2\" y2=\"6\"/><line x1=\"8\" x2=\"8\" y1=\"2\" y2=\"6\"/><line x1=\"3\" x2=\"21\" y1=\"10\" y2=\"10\"/></svg>",
  "width": 24,
  "height": 24,
  "fill": "#000000",
  "originX": "center",
  "originY": "center",
  "zIndex": 30
}

Add a large star icon (48x48) in purple:
add-svg:
{
  "x": 540,
  "y": 400,
  "svgData": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><polygon points=\"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2\"/></svg>",
  "width": 48,
  "height": 48,
  "fill": "#A855F7",
  "originX": "center",
  "originY": "center",
  "zIndex": 25
}

REMEMBER: Use add-svg for ALL icons, not emojis or special characters!

=== BRAND GUIDELINES ===

NAMING AND BRAND NAME
- Always write the company name as "ElevenLabs"
- Never use "Eleven Labs", "Elevenlabs", "elevenlabs", or variations
- Logo files available:
  * /elevenlabs-logo-black.png - Black logo (PNG format) (USE ON WHITE BACKGROUNDS)
  * /elevenlabs-logo-white.png - White logo (PNG format) (USE ON DARK BACKGROUNDS)
  * /elevenlabs-logo-black.svg - Black logo (SVG format, vector) (USE ON WHITE BACKGROUNDS)
  * /elevenlabs-logo-white.svg - White logo (SVG format, vector) (USE ON DARK BACKGROUNDS)

CORE BRAND COLORS
- Canvas: White (#FFFFFF)
- Default element: Black (#000000)
- Neutrals: N50 #F2F2F2, N100 #E5E5E5, N200 #DCDCDC, N300 #BDBDBD, N400 #949494,
  N500 #767676, N600 #6E6E6E, N700 #525252, N800 #464646, N900 #3D3D3D, N950 #292929
- Secondary tints (use sparingly for emphasis):
  Purple: P50 #FBF6FE to P950 #32123E
  Magenta: M50 #FCF2FB to M950 #3F0D35
  Red: R50 #FEF3F2 to R950 #440D0B
- Backgrounds: use 50 tints for functional backgrounds, 300-500 for expressive blocks
- UI defaults: neutrals. Use stronger tints for active states and tags

TYPOGRAPHY
- Primary family: "Inter" (as substitute for Eleven)
- Default headings: Semi Condensed Bold or ALL CAPS (use sparingly)
- Body: Regular with generous line height
- Use sentence case for headings and UI strings unless ALL CAPS style requested
- Left align text. Avoid center or right alignment for long text blocks
- Keep ample letter spacing and line height

LOGO USAGE
- Available logo files:
  * Black logo PNG: /elevenlabs-logo-black.png
  * White logo PNG: /elevenlabs-logo-white.png
  * Black logo SVG: /elevenlabs-logo-black.svg (prefer for scalability)
  * White logo SVG: /elevenlabs-logo-white.svg (prefer for scalability)
- Default: Use black logo on white or light backgrounds
- Inverse: Use white logo on dark backgrounds only
- Prefer SVG format for better quality at any size
- Keep clear space equal to logo height on all sides
- Never add shadows, strokes, rotations, recolors, stretching
- Logo dimensions should be proportional (typical: 150-250px width for social posts)

WRITING TONE
- Efficiency, simplicity, clarity, freshness
- Prefer short, concrete words. Cut needless words. Use active voice
- Avoid vague advertising language and clichés
- Sentence case for headings unless explicitly ALL CAPS

CANVAS DIMENSIONS BY USE CASE
- LinkedIn Post: 1200x627
- Instagram Post: 1080x1080
- Instagram Story: 1080x1920
- Facebook Post: 1200x628
- Twitter Post: 1200x675
- Banner Ad: 728x90
- Medium Rectangle Ad: 300x250
- Skyscraper Ad: 160x600
- A4 Print: 595x842
- Letter Print: 612x792

=== DESIGN PRINCIPLES ===
- High contrast for readability (meet WCAG standards)
- Ample spacing and clear hierarchy
- Do not crowd the logo or headings
- Reserve saturated colors (300-500 tints) for emphasis only
- Position elements thoughtfully relative to canvas size
- Create balanced compositions

POSITIONING WITH ORIGINX AND ORIGINY (CRITICAL!)
ALWAYS specify originX and originY parameters when adding elements. These control how x,y coordinates are interpreted:

originX options: 'left', 'center', 'right'
originY options: 'top', 'center', 'bottom'

POSITIONING RULES:
1. For LOGOS and IMAGES: Use originX: 'left', originY: 'top'
   - This makes x,y refer to the TOP-LEFT CORNER of the image
   - Most intuitive for precise positioning
   - Example: Logo at (120, 50) with originX: 'left', originY: 'top' → top-left corner at that position

2. For TEXT: Use originX: 'center', originY: 'center'
   - This makes x,y refer to the CENTER of the text
   - Better for centering and alignment
   - Example: Headline at (540, 400) with originX: 'center', originY: 'center' → text centered at that position

3. For BACKGROUND RECTANGLES: Use originX: 'left', originY: 'top'
   - Consistent with standard coordinate systems
   - Example: Rectangle at (0, 0) with originX: 'left', originY: 'top' → fills from top-left

4. For DECORATIVE CIRCLES: Use originX: 'center', originY: 'center'
   - Natural for circular elements
   - Example: Circle at (800, 600) with originX: 'center', originY: 'center' → circle centered at that point

IMPORTANT: If you don't specify originX/originY, positioning will be unpredictable!

Example add-image call for logo:
{
  "x": 120,
  "y": 50,
  "src": "/elevenlabs-logo-black.svg",
  "width": 180,
  "height": 60,
  "originX": "left",
  "originY": "top",
  "zIndex": 25
}

GRADIENT FILLS (OPTIONAL BUT POWERFUL!)
You can create beautiful gradient fills for rectangles and circles instead of solid colors.

Gradient Types:
- "linear": Straight-line gradient (e.g., top to bottom, left to right, diagonal)
- "radial": Circular gradient radiating from a center point

Gradient Coordinates (relative to shape center):
- For rectangles: Use -width/2 and -height/2 for edges
- For circles: Use -radius to +radius for edges
- x1, y1: Start point of gradient
- x2, y2: End point of gradient
- r1, r2: Radii for radial gradients (optional)

Color Stops:
- Array of {offset: number, color: string}
- offset: 0 to 1 (0 = start, 1 = end, 0.5 = middle)
- color: MUST be hex format like "#FF0000" or "#A855F7" (include the # symbol)

Example 1: Linear gradient rectangle (top to bottom, black to red to blue)
{
  "x": 20,
  "y": 20,
  "width": 300,
  "height": 200,
  "gradient": {
    "type": "linear",
    "coords": {
      "x1": 0,
      "y1": -100,
      "x2": 0,
      "y2": 100
    },
    "colorStops": [
      {"offset": 0, "color": "#000000"},
      {"offset": 0.5, "color": "#FF0000"},
      {"offset": 1, "color": "#0000FF"}
    ]
  },
  "originX": "left",
  "originY": "top",
  "zIndex": 0
}

Example 2: Radial gradient circle (center outward)
{
  "x": 400,
  "y": 400,
  "radius": 100,
  "gradient": {
    "type": "radial",
    "coords": {
      "x1": 0,
      "y1": 0,
      "x2": 0,
      "y2": 0,
      "r1": 0,
      "r2": 100
    },
    "colorStops": [
      {"offset": 0, "color": "#FFFFFF"},
      {"offset": 1, "color": "#FF00FF"}
    ]
  },
  "originX": "center",
  "originY": "center",
  "zIndex": 10
}

Example 3: Diagonal linear gradient (top-left to bottom-right)
{
  "x": 0,
  "y": 0,
  "width": 1080,
  "height": 1080,
  "gradient": {
    "type": "linear",
    "coords": {
      "x1": -540,
      "y1": -540,
      "x2": 540,
      "y2": 540
    },
    "colorStops": [
      {"offset": 0, "color": "#667EEA"},
      {"offset": 1, "color": "#764BA2"}
    ]
  },
  "originX": "left",
  "originY": "top",
  "zIndex": 0
}

IMPORTANT: Use either "fill" OR "gradient", not both. If gradient is provided, fill will be ignored.

LAYERING AND Z-INDEX (CRITICAL!)
Always set zIndex parameter when adding elements. Proper layering prevents visual conflicts:
- LAYER 0-10: Background elements (solid fills, gradient rectangles)
  * Background fill: zIndex 0
  * Decorative background shapes: zIndex 1-5
- LAYER 10-20: Mid-layer decorative elements
  * Accent shapes behind content: zIndex 10-15
  * Decorative circles/patterns: zIndex 15-20
- LAYER 20-30: Images and logos
  * Product images: zIndex 20-25
  * Brand logos: zIndex 25-30 (should be clearly visible)
- LAYER 30-50: Text content (MUST be on top)
  * Body text: zIndex 30-35
  * Subheadings: zIndex 35-40
  * Main headlines: zIndex 40-45
  * Call-to-action buttons/text: zIndex 45-50 (highest priority)

LAYERING RULES:
1. Always add backgrounds FIRST with zIndex 0-5
2. Add decorative elements with zIndex 10-20
3. Add images/logos with zIndex 20-30
4. Add ALL text LAST with zIndex 30-50
5. Text must ALWAYS have higher zIndex than backgrounds and shapes
6. Important text (headlines, CTAs) must have highest zIndex values
7. If text needs a background, make background element have zIndex 2-3 less than the text

Example order for Instagram post:
1. White background rectangle (zIndex: 0)
2. Purple decorative circle (zIndex: 10)
3. ElevenLabs logo (zIndex: 25)
4. Discount text "20% OFF" (zIndex: 40)
5. Body text "Limited time offer" (zIndex: 35)
6. CTA button background (zIndex: 32)
7. CTA button text "Shop Now" (zIndex: 45)

=== COMPLIANCE ===
- If a request conflicts with brand rules, propose a compliant alternative
- Always maintain brand integrity

When making changes, reference the operation IDs. Each operation returns an ID for later edits or removal.

REMEMBER: ALWAYS call planning-agent FIRST, wait for approval, then execute!`,
  tools: [
    planningAgent.asTool({
      toolName: 'planning-agent',
      toolDescription: 'Create a detailed, step-by-step design plan based on the user\'s request. Use this FIRST before executing any design. Pass the user\'s design request as-is to this agent.',
    }),
    setCanvasSizeTool,
    addRectangleTool,
    addCircleTool,
    addTextTool,
    addImageTool,
    addSVGTool,
    removeOperationTool,
    updateOperationTool,
  ],
  model,
});

// ----- WS + Sessions -----
type Session = {
  ws: any;
  closed: boolean;
  conversationId: string;
  runner: Runner;
  agent: Agent;
  maxTurns: number;
  stateString?: string;
  lastHistory: any[];
  runId: number;
  currentDesign?: Design;
};
const sessions = new Map<any, Session>();
const conversationDesigns = new Map<string, Design>();
const designVersions = new Map<string, Array<Design & { version: number; savedAt: Date }>>();
const conversationPlans = new Map<string, DesignPlan>();

let currentConversationId: string | null = null;
let currentWebSocket: any = null;

function getOrCreateDesign(conversationId: string): Design {
  if (!conversationDesigns.has(conversationId)) {
    conversationDesigns.set(conversationId, {
      id: `design-${Date.now()}`,
      name: 'Untitled Design',
      width: 800,
      height: 600,
      operations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return conversationDesigns.get(conversationId)!;
}

function addOperationToDesign(conversationId: string, operation: DesignOperation) {
  const design = getOrCreateDesign(conversationId);
  design.operations.push(operation);
  design.updatedAt = new Date();
  conversationDesigns.set(conversationId, design);
  
  if (currentWebSocket) {
    safeSend(currentWebSocket, {
      type: 'design_update',
      data: {
        conversationId,
        design,
        latestOperation: operation,
      },
    });
  }
  
  return design;
}

const wss = new WebSocketServer({ 
  port: 8787,
  host: '0.0.0.0',
  verifyClient: () => true,
});
console.log('Running ws on ws://0.0.0.0:8787');

wss.on('connection', (ws) => {
  ws.on('close', () => {
    const s = sessions.get(ws);
    if (s) s.closed = true;
  });

  ws.on('message', async (raw) => {
    let data: any;
    try {
      data = JSON.parse(String(raw));
    } catch {
      safeSend(ws, { error: 'invalid_json' });
      return;
    }

    if (data?.kind === 'approve_plan') {
      const planId = data.planId;
      const conversationId = data.conversationId;

      if (!planId || !conversationId) {
        safeSend(ws, { error: 'missing_plan_id_or_conversation_id' });
        return;
      }

      const plan = conversationPlans.get(conversationId);
      if (!plan || plan.id !== planId) {
        safeSend(ws, { error: 'plan_not_found' });
        return;
      }

      plan.status = 'approved';
      plan.updatedAt = new Date();
      conversationPlans.set(conversationId, plan);

      safeSend(ws, {
        type: 'plan_approved',
        data: {
          conversationId,
          planId,
        },
      });

      const session = sessions.get(ws);
      if (session) {
        const planDetails = `The plan has been approved. Here is the approved plan to execute:

Design Type: ${plan.designType}
Canvas Dimensions: ${plan.dimensions.width} × ${plan.dimensions.height} pixels

Steps to execute in order:
${plan.items.map((item, i) => `${i + 1}. ${item.description}${item.details ? `\n   Details: ${item.details}` : ''}`).join('\n')}

Please proceed with execution step by step. Start by calling set-canvas-size, then execute each step using the appropriate tools (add-rectangle, add-circle, add-text, add-image).`;
        
        startRun(session, [{ role: 'user', content: planDetails }]).catch((err) => {
          safeSend(ws, { error: String(err?.message ?? err) });
        });
      }

      return;
    }

    if (data?.kind === 'reject_plan') {
      const planId = data.planId;
      const conversationId = data.conversationId;
      const feedback = data.feedback || 'Plan rejected';

      if (!planId || !conversationId) {
        safeSend(ws, { error: 'missing_plan_id_or_conversation_id' });
        return;
      }

      const plan = conversationPlans.get(conversationId);
      if (!plan || plan.id !== planId) {
        safeSend(ws, { error: 'plan_not_found' });
        return;
      }

      plan.status = 'rejected';
      plan.updatedAt = new Date();

      safeSend(ws, {
        type: 'plan_rejected',
        data: {
          conversationId,
          planId,
        },
      });

      const session = sessions.get(ws);
      if (session) {
        startRun(session, [{ role: 'user', content: `The plan was rejected. User feedback: "${feedback}". Please create a new plan addressing this feedback.` }]).catch((err) => {
          safeSend(ws, { error: String(err?.message ?? err) });
        });
      }

      return;
    }

    if (data?.kind === 'save_design') {
      const design = data.design;
      const conversationId = data.conversationId;

      if (!design || !conversationId) {
        safeSend(ws, { error: 'missing_design_or_conversation_id' });
        return;
      }

      const currentDesign = conversationDesigns.get(conversationId);
      if (!currentDesign) {
        safeSend(ws, { error: 'design_not_found' });
        return;
      }

      const versions = designVersions.get(conversationId) || [];
      versions.push({
        ...currentDesign,
        version: versions.length + 1,
        savedAt: new Date(),
      });
      designVersions.set(conversationId, versions);

      conversationDesigns.set(conversationId, {
        ...design,
        updatedAt: new Date(),
      });

      safeSend(ws, {
        type: 'design_saved',
        data: {
          success: true,
          version: versions.length,
          versions: versions.map(v => ({
            version: v.version,
            savedAt: v.savedAt,
            name: v.name,
          })),
          design: conversationDesigns.get(conversationId),
        },
      });

      return;
    }

    if (data?.kind === 'load_version') {
      const conversationId = data.conversationId;
      const versionNumber = data.version;

      if (!conversationId || versionNumber === undefined) {
        safeSend(ws, { error: 'missing_conversation_id_or_version' });
        return;
      }

      const versions = designVersions.get(conversationId) || [];
      const version = versions.find(v => v.version === versionNumber);

      if (!version) {
        safeSend(ws, { error: 'version_not_found' });
        return;
      }

      conversationDesigns.set(conversationId, {
        ...version,
        updatedAt: new Date(),
      });

      safeSend(ws, {
        type: 'design_update',
        data: {
          conversationId,
          design: version,
        },
      });

      return;
    }

    if (data?.kind === 'message') {
      const text = typeof data.message === 'string' ? data.message.trim() : '';
      if (!text) {
        safeSend(ws, { error: 'empty_message' });
        return;
      }

      let session = sessions.get(ws);

      if (!data.conversationId) {
        const conversationId = genId();

        safeSend(ws, {
          type: 'streaming',
          data: { conversationId },
        });

        const runner = new Runner({
          groupId: conversationId,
          modelSettings: { parallelToolCalls: false },
          
        });

        session = {
          ws,
          closed: false,
          conversationId,
          runner,
          agent: designAgent,
          maxTurns: typeof data.maxTurns === 'number' ? data.maxTurns : 50,
          stateString: undefined,
          lastHistory: [],
          runId: 0,
        };
        sessions.set(ws, session);

        startRun(session, [{ role: 'user', content: text }]).catch((err) => {
          safeSend(ws, { error: String(err?.message ?? err) });
        });
        return;
      }

      if (!session) {
        safeSend(ws, { error: 'session_not_found' });
        return;
      }

      if (session.stateString) {
        safeSend(ws, { error: 'pending_approvals' });
        return;
      }

      const messages = session.lastHistory.length
        ? [...session.lastHistory, { role: 'user', content: text }]
        : [{ role: 'user', content: text }];

      startRun(session, messages).catch((err) => {
        safeSend(ws, { error: String(err?.message ?? err) });
      });
      return;
    }

    if (data?.kind === 'approvals' && Array.isArray(data.decisions)) {
      const s = sessions.get(ws);
      if (!s) {
        safeSend(ws, { error: 'session_not_found' });
        return;
      }
      if (!s.stateString) {
        safeSend(ws, { error: 'no_pending_approvals' });
        return;
      }

      const state = await RunState.fromString(s.agent, s.stateString);
      const decisionsMap = new Map<string, 'approved' | 'rejected'>();
      for (const d of data.decisions) {
        const callId = d?.callId;
        const decision = d?.decision;
        if (
          typeof callId === 'string' &&
          (decision === 'approved' || decision === 'rejected')
        ) {
          decisionsMap.set(callId, decision);
        }
      }

      const interruptions = state.getInterruptions();
      for (const item of interruptions) {
        const appr = item as RunToolApprovalItem;
        if (appr.type === 'tool_approval_item' && 'callId' in appr.rawItem) {
          const cid = appr.rawItem.callId as string;
          const dec = decisionsMap.get(cid);
          if (dec === 'approved') state.approve(appr);
          else if (dec === 'rejected') state.reject(appr);
        }
      }

      startRun(s, state).catch((err) => {
        safeSend(ws, { error: String(err?.message ?? err) });
      });
      return;
    }
  });
});

// ----- Helpers -----
function safeSend(ws: any, obj: any) {
  try {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
  } catch {}
}
function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function startRun(session: Session, input: any[] | RunState<any, any>) {
  if (session.closed) return;
  const myRunId = ++session.runId;

  currentConversationId = session.conversationId;
  currentWebSocket = session.ws;

  try {
  const stream = await session.runner.run(session.agent, input, {
    stream: true,
    maxTurns: session.maxTurns,
  });

  for await (const ev of stream.toStream()) {
    if (session.closed) break;
    if (myRunId !== session.runId) break;
    if (session.ws.readyState !== session.ws.OPEN) break;
    session.ws.send(JSON.stringify(ev));
  }

  await stream.completed;
  if (session.closed || myRunId !== session.runId) return;

  session.lastHistory = stream.history ?? session.lastHistory;

  if (stream.interruptions && stream.interruptions.length > 0) {
    session.stateString = JSON.stringify(stream.state);
    return;
  }

  session.stateString = undefined;
    
    const design = conversationDesigns.get(session.conversationId);
  safeSend(session.ws, {
    type: 'complete',
    data: {
      conversationId: session.conversationId,
      history: stream.history,
      response: stream.finalOutput,
        design: design,
    },
  });
  } finally {
    currentConversationId = null;
    currentWebSocket = null;
  }
}
