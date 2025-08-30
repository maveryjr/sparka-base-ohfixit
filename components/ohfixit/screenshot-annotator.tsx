'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Tool = 'rect' | 'arrow' | 'blur' | 'none';

interface AnnotatorProps {
  imageSrc: string;
  className?: string;
  onExport?: (blob: Blob) => void | Promise<void>;
}

interface DrawOp {
  tool: Tool;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export function ScreenshotAnnotator({ imageSrc, className, onExport }: AnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>('rect');
  const [ops, setOps] = useState<DrawOp[]>([]);
  const [redoStack, setRedo] = useState<DrawOp[]>([]);
  const [isDown, setIsDown] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);

  // Load image and size canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      imgRef.current = img as HTMLImageElement;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      redraw();
    };
  }, [imageSrc]);

  const redraw = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // draw ops
    for (const op of ops) {
      drawOp(ctx, op);
    }
  };

  const drawOp = (ctx: CanvasRenderingContext2D, op: DrawOp) => {
    const { from, to, tool } = op;
    switch (tool) {
      case 'rect': {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,0,0,0.9)';
        ctx.lineWidth = 3;
        const w = to.x - from.x;
        const h = to.y - from.y;
        ctx.strokeRect(from.x, from.y, w, h);
        ctx.restore();
        break;
      }
      case 'arrow': {
        ctx.save();
        ctx.strokeStyle = 'rgba(0,128,255,0.9)';
        ctx.lineWidth = 3;
        drawArrow(ctx, from, to);
        ctx.restore();
        break;
      }
      case 'blur': {
        // Approximate blur by drawing a filled rect with a transparent overlay
        // and re-drawing a scaled copy region. It's a simple placeholder.
        ctx.save();
        const x = Math.min(from.x, to.x);
        const y = Math.min(from.y, to.y);
        const w = Math.abs(to.x - from.x);
        const h = Math.abs(to.y - from.y);
        try {
          // Sample region and scale down then back up to fake a blur
          const sample = ctx.getImageData(x, y, w, h);
          const off = document.createElement('canvas');
          off.width = Math.max(1, Math.round(w / 8));
          off.height = Math.max(1, Math.round(h / 8));
          const offCtx = off.getContext('2d');
          if (offCtx) {
            // draw sample into offscreen
            const tmp = document.createElement('canvas');
            tmp.width = w;
            tmp.height = h;
            const tmpCtx = tmp.getContext('2d');
            if (tmpCtx) {
              tmpCtx.putImageData(sample, 0, 0);
              offCtx.imageSmoothingEnabled = true;
              offCtx.drawImage(tmp, 0, 0, off.width, off.height);
              ctx.imageSmoothingEnabled = true;
              ctx.drawImage(off, x, y, off.width, off.height, x, y, w, h);
            }
          }
        } catch {
          // fallback: translucent overlay
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(x, y, w, h);
        }
        ctx.restore();
        break;
      }
    }
  };

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) => {
    const headLength = 12; // length of head in pixels
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle - Math.PI / 6),
      to.y - headLength * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      to.x - headLength * Math.cos(angle + Math.PI / 6),
      to.y - headLength * Math.sin(angle + Math.PI / 6),
    );
    ctx.lineTo(to.x, to.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,128,255,0.9)';
    ctx.fill();
  };

  const pointerPos = (ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    // scale to canvas coords
    const canvas = canvasRef.current!;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: x * scaleX, y: y * scaleY };
  };

  const onDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDown(true);
    setRedo([]);
    setStart(pointerPos(e));
  };

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDown || !start) return;
    const cur = pointerPos(e);
    redraw();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawOp(ctx, { tool, from: start, to: cur });
  };

  const onUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDown || !start) return;
    setIsDown(false);
    const end = pointerPos(e);
    setOps((prev) => [...prev, { tool, from: start, to: end }]);
    setStart(null);
  };

  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ops]);

  const undo = () => {
    setOps((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedo((r) => [...r, last]);
      return prev.slice(0, -1);
    });
  };
  const redo = () => {
    setRedo((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setOps((o) => [...o, last]);
      return prev.slice(0, -1);
    });
  };

  const exportPng = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      await onExport?.(blob);
    }, 'image/png');
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        <Button variant={tool === 'rect' ? 'default' : 'outline'} size="sm" onClick={() => setTool('rect')}>
          Box
        </Button>
        <Button variant={tool === 'arrow' ? 'default' : 'outline'} size="sm" onClick={() => setTool('arrow')}>
          Arrow
        </Button>
        <Button variant={tool === 'blur' ? 'default' : 'outline'} size="sm" onClick={() => setTool('blur')}>
          Blur
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={undo} disabled={ops.length === 0}>
            Undo
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={redoStack.length === 0}>
            Redo
          </Button>
          <Button size="sm" onClick={exportPng}>Export PNG</Button>
        </div>
      </div>
      <div className="border rounded-md overflow-hidden">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto"
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={() => isDown && setIsDown(false)}
        />
      </div>
    </div>
  );
}

export default ScreenshotAnnotator;
