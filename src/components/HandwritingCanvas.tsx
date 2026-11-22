import React, { useEffect, useRef, useState } from 'react';
import { Eraser, RotateCcw, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { FeatherQuillGraphic } from './WizardingArtwork';

interface HandwritingCanvasProps {
  onTranscribed: (text: string) => void;
}

interface StrokePoint {
  x: number;
  y: number;
  width: number;
}

interface InkStroke {
  color: string;
  points: StrokePoint[];
}

const INK_COLORS = [
  { id: 'sepia', label: 'Sepia Ink', hex: '#2a180d' },
  { id: 'midnight', label: 'Midnight Quill', hex: '#141b33' },
  { id: 'crimson', label: 'Dragonblood', hex: '#7a161c' },
  { id: 'emerald', label: 'Slytherin Ink', hex: '#14442b' },
];

export const HandwritingCanvas: React.FC<HandwritingCanvasProps> = ({ onTranscribed }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<InkStroke[]>([]);
  const activeStrokeRef = useRef<InkStroke | null>(null);
  const isDrawingRef = useRef(false);
  const lastClientXRef = useRef<number | null>(null);

  const [inkColor, setInkColor] = useState(INK_COLORS[0].hex);
  const [strokeCount, setStrokeCount] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [quillCursor, setQuillCursor] = useState<{
    visible: boolean;
    x: number;
    y: number;
    tilt: number;
    writing: boolean;
  }>({ visible: false, x: 0, y: 0, tilt: 0, writing: false });

  const drawParchmentLines = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const grad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.45,
      40,
      width * 0.5,
      height * 0.5,
      width * 0.65
    );
    grad.addColorStop(0, '#fbf4e4');
    grad.addColorStop(1, '#ede0c4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Classic manuscript crimson double margin line
    ctx.strokeStyle = 'rgba(140, 29, 36, 0.2)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(56, 14);
    ctx.lineTo(56, height - 14);
    ctx.moveTo(61, 14);
    ctx.lineTo(61, height - 14);
    ctx.stroke();

    // Horizontal ruled ink lines
    ctx.strokeStyle = 'rgba(130, 96, 54, 0.17)';
    ctx.lineWidth = 1;
    for (let y = 44; y < height - 12; y += 38) {
      ctx.beginPath();
      ctx.moveTo(18, y);
      ctx.lineTo(width - 18, y);
      ctx.stroke();
    }
  };

  const redrawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawParchmentLines(ctx, canvas.width, canvas.height);

    const allStrokes = activeStrokeRef.current
      ? [...strokesRef.current, activeStrokeRef.current]
      : strokesRef.current;

    for (const stroke of allStrokes) {
      if (stroke.points.length < 1) continue;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.points.length === 1) {
        const pt = stroke.points[0];
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.width / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1];
        const curr = stroke.points[i];
        ctx.beginPath();
        ctx.lineWidth = (prev.width + curr.width) / 2;
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }
    }
  };

  useEffect(() => {
    redrawAll();
  }, []);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const updateQuillOverlay = (e: React.PointerEvent<HTMLCanvasElement>, writing: boolean) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const dx = lastClientXRef.current !== null ? e.clientX - lastClientXRef.current : 0;
    lastClientXRef.current = e.clientX;
    const tilt = Math.max(-14, Math.min(14, dx * 0.9));

    setQuillCursor({
      visible: true,
      x: localX,
      y: localY,
      tilt,
      writing,
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getCanvasPoint(e);
    isDrawingRef.current = true;
    activeStrokeRef.current = {
      color: inkColor,
      points: [{ x, y, width: 3.2 }],
    };
    setStatusMessage(null);
    updateQuillOverlay(e, true);
    redrawAll();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    updateQuillOverlay(e, isDrawingRef.current);
    if (!isDrawingRef.current || !activeStrokeRef.current) return;
    const { x, y } = getCanvasPoint(e);
    const pts = activeStrokeRef.current.points;
    const last = pts[pts.length - 1];
    const dist = Math.hypot(x - last.x, y - last.y);
    if (dist < 1.5) return;

    const targetWidth = Math.max(2.0, Math.min(4.8, 4.5 - dist * 0.08));
    pts.push({ x, y, width: targetWidth });
    redrawAll();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    updateQuillOverlay(e, false);
    if (!isDrawingRef.current || !activeStrokeRef.current) return;
    isDrawingRef.current = false;
    strokesRef.current = [...strokesRef.current, activeStrokeRef.current];
    activeStrokeRef.current = null;
    setStrokeCount(strokesRef.current.length);
    redrawAll();
  };

  const handlePointerLeave = () => {
    lastClientXRef.current = null;
    setQuillCursor((prev) => ({ ...prev, visible: false, writing: false }));
  };

  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokeCount(strokesRef.current.length);
    setStatusMessage(null);
    redrawAll();
  };

  const handleClear = () => {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    setStrokeCount(0);
    setStatusMessage(null);
    redrawAll();
  };

  const handleDetectWriting = async () => {
    if (strokesRef.current.length === 0) {
      setStatusMessage('Write a word or sentence with your feather quill on the parchment first.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDetecting(true);
    setStatusMessage('Deciphering quill strokes...');

    try {
      const imageDataUrl = canvas.toDataURL('image/png');
      const response = await fetch('/api/ink-transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl }),
      });

      const data = (await response.json()) as { text?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Transcription failed.');
      }

      const detected = (data.text || '').trim();
      if (!detected) {
        setStatusMessage('No clear letters were detected. Try writing slightly larger.');
      } else {
        onTranscribed(detected);
        setStatusMessage(`Detected: "${detected}"`);
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to detect handwriting.');
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#473324]">Quill Ink:</span>
          {INK_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setInkColor(c.hex)}
              title={c.label}
              aria-label={c.label}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                inkColor === c.hex ? 'border-[#8c1d24] scale-110' : 'border-[#bfa882]'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokeCount === 0 || isDetecting}
            className="px-3 py-1.5 rounded-md border border-[#bfa882] bg-[#fbf6ea] text-xs font-medium text-[#3d2b1f] hover:border-[#6e523a] disabled:opacity-45 flex items-center gap-1.5 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Undo
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={strokeCount === 0 || isDetecting}
            className="px-3 py-1.5 rounded-md border border-[#bfa882] bg-[#fbf6ea] text-xs font-medium text-[#3d2b1f] hover:border-[#6e523a] disabled:opacity-45 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Eraser className="w-3.5 h-3.5" />
            Clear
          </button>
          <button
            type="button"
            onClick={handleDetectWriting}
            disabled={isDetecting || strokeCount === 0}
            className="px-4 py-1.5 rounded-md bg-[#8c1d24] text-[#f9f3e6] text-xs font-semibold hover:bg-[#70141a] disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isDetecting ? 'Reading Ink...' : 'Detect Handwriting'}
          </button>
        </div>
      </div>

      {/* Interactive Parchment Surface with Animated Feather Quill */}
      <div className="relative rounded-lg overflow-hidden border-2 border-[#bfa882] bg-[#f6eedc] shadow-inner">
        <canvas
          ref={canvasRef}
          width={900}
          height={320}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className="w-full h-56 sm:h-64 touch-none cursor-none block"
        />

        {quillCursor.visible && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 z-20"
            animate={{
              x: quillCursor.x - 8,
              y: quillCursor.y - 80 + (quillCursor.writing ? 4 : 0),
              rotate: quillCursor.tilt + (quillCursor.writing ? -8 : 0),
              scale: quillCursor.writing ? 0.96 : 1,
            }}
            transition={{ type: 'spring', stiffness: 720, damping: 38, mass: 0.25 }}
            style={{ originX: 0.08, originY: 0.92 }}
          >
            <FeatherQuillGraphic
              inkHex={inkColor}
              isWriting={quillCursor.writing}
              className="w-20 h-20 drop-shadow-[0_6px_8px_rgba(35,23,15,0.38)]"
            />
          </motion.div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[#5e4736]">
        <span>Move your feather quill across the parchment to write, then click Detect Handwriting.</span>
        {statusMessage && <span className="font-semibold text-[#8c1d24]">{statusMessage}</span>}
      </div>
    </div>
  );
};
