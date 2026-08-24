import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SIGNATURE_BOX, type SignatureStroke } from '../../../../shared/contractSignature';

// Draw-a-signature input for the public contract page.
//
// It captures GEOMETRY, not pixels. The canvas is only what the person sees while they
// sign; what leaves this component is the list of strokes in SIGNATURE_BOX coordinates,
// which shared/contractSignature.ts then encodes as an SVG path small enough to survive
// the server's 4000-character truncation. Nothing here ever calls toDataURL(): a PNG data
// URL is 5-30KB and would be cut in half in the database with no error anywhere.
//
// Points are captured in BOX units rather than screen pixels, so a signature drawn on a
// 320px phone and the same signature drawn on a 900px desktop encode to the same size and
// re-render identically. That is also what makes the character budget mean something: it
// cannot be blown by signing on a bigger screen.
//
// Pointer events (not mouse + touch separately) so a finger, a stylus and a mouse take one
// code path, and setPointerCapture so a stroke that runs off the edge of the box finishes
// where the hand actually went instead of stopping at the border.

interface SignaturePadProps {
  /** Fires when a stroke finishes or the pad is cleared. */
  onChange: (strokes: SignatureStroke[]) => void;
  disabled?: boolean;
  label: string;
  hint: string;
  clearLabel: string;
  undoLabel: string;
}

/** Points closer together than this add characters to the encoding and nothing to the mark. */
const MIN_POINT_DISTANCE = 1.5;

/** Line weight in CSS pixels, kept constant on screen whatever the pad is scaled to. */
const STROKE_PX = 2.5;

export default function SignaturePad({
  onChange,
  disabled,
  label,
  hint,
  clearLabel,
  undoLabel,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // The strokes live in a ref, not in state: a pointermove fires dozens of times a second
  // and re-rendering React on each one makes the line lag behind the finger. State holds
  // only the stroke COUNT, which is all the buttons need to know.
  const strokesRef = useRef<SignatureStroke[]>([]);
  const drawingRef = useRef(false);
  const [strokeCount, setStrokeCount] = useState(0);

  /** Repaint everything from the stored strokes — after a resize, an undo or a clear. */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    // Draw in box units: the transform maps 0..600 x 0..200 onto the backing store, so the
    // same stroke data paints identically at any size.
    const scale = targetW / SIGNATURE_BOX.width;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, targetH / SIGNATURE_BOX.height, 0, 0);

    ctx.strokeStyle = '#111827';
    ctx.lineWidth = (STROKE_PX * dpr) / scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokesRef.current) {
      if (!stroke.length) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      if (stroke.length === 1) {
        // A tap is a dot. lineTo the same point plus a round cap paints it; without this
        // the dot on an "i" is captured and then never shown.
        ctx.lineTo(stroke[0].x, stroke[0].y);
      } else {
        for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    redraw();
    const onResize = () => redraw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [redraw]);

  const pointFrom = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: ((e.clientX - rect.left) / rect.width) * SIGNATURE_BOX.width,
      y: ((e.clientY - rect.top) / rect.height) * SIGNATURE_BOX.height,
    };
  };

  const handleDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const p = pointFrom(e);
    if (!p) return;
    // Stops the page scrolling under a finger that is trying to sign.
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a convenience; the stroke still works without it */
    }
    drawingRef.current = true;
    strokesRef.current = strokesRef.current.concat([[p]]);
    redraw();
  };

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || !drawingRef.current) return;
    const p = pointFrom(e);
    if (!p) return;
    e.preventDefault();
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    if (!stroke) return;
    const last = stroke[stroke.length - 1];
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < MIN_POINT_DISTANCE) return;
    stroke.push(p);

    // Paint only the new segment. A full redraw per move is what makes a signature pad
    // feel like it is dragging behind the finger on a phone.
    const canvas = canvasRef.current;
    const ctx = canvas && canvas.getContext('2d');
    if (ctx && last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  };

  const endStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setStrokeCount(strokesRef.current.length);
    // A new array each time, so the parent's useMemo on the strokes actually re-runs and
    // the encoded size is recomputed while the person is still standing at the pad.
    onChange(strokesRef.current.map((s) => s.slice()));
  };

  /**
   * Only ends the stroke when the pointer is NOT captured.
   *
   * setPointerCapture is what lets a signature that overshoots the box finish where the
   * hand actually went, but boundary events still fire at the capture target — so ending
   * the stroke on every pointerleave would clip every overshoot at the border and undo
   * the capture entirely. When capture was refused this is the only thing that stops a
   * released pointer from carrying on drawing over the pad.
   */
  const handleLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const el = e.currentTarget;
    if (typeof el.hasPointerCapture === 'function' && el.hasPointerCapture(e.pointerId)) return;
    endStroke();
  };

  const clear = () => {
    strokesRef.current = [];
    setStrokeCount(0);
    redraw();
    onChange([]);
  };

  const undo = () => {
    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokeCount(strokesRef.current.length);
    redraw();
    onChange(strokesRef.current.map((s) => s.slice()));
  };

  return (
    <div>
      <div className="relative rounded-lg border-2 border-dashed border-gray-300 bg-white">
        {/* The ruled line a paper form would have, drawn behind the canvas so that clearing
            the signature does not also wipe the line the person was signing on. */}
        <div className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-gray-300" />
        {strokeCount === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="select-none text-sm text-gray-400">{hint}</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          aria-label={label}
          role="img"
          className="block w-full cursor-crosshair rounded-lg"
          style={{ aspectRatio: '3 / 1', touchAction: 'none' }}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={handleLeave}
        />
      </div>
      <div className="mt-2 flex justify-end gap-4">
        <button
          type="button"
          onClick={undo}
          disabled={disabled || strokeCount === 0}
          className="text-sm text-gray-500 underline underline-offset-2 hover:text-gray-800 disabled:cursor-not-allowed disabled:text-gray-300 disabled:no-underline"
        >
          {undoLabel}
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={disabled || strokeCount === 0}
          className="text-sm text-gray-500 underline underline-offset-2 hover:text-gray-800 disabled:cursor-not-allowed disabled:text-gray-300 disabled:no-underline"
        >
          {clearLabel}
        </button>
      </div>
    </div>
  );
}
