import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Copy,
  Eraser,
  Film,
  Layers,
  PaintBucket,
  Pause,
  PenTool,
  Play,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { MotionPreset } from '../types/drawing';
import {
  CANVAS_PIXEL_HEIGHT,
  CANVAS_PIXEL_WIDTH,
  CANVAS_SCALE,
  exportCanvasWithWhiteBg,
  floodFillCanvas,
} from '../utils/canvasHelpers';
import { soundFX } from '../utils/soundEffects';
import { MascotGuide } from './MascotGuide';

interface FlipbookStudioProps {
  initialFrameUrl?: string | null;
  initialTitle?: string;
  onSaveAnimation: (
    frames: string[],
    title: string,
    fps: number,
    motionPreset: MotionPreset
  ) => void;
}

const ANIM_PALETTE = [
  '#1E293B',
  '#EF4444',
  '#F59E0B',
  '#22C55E',
  '#0284C7',
  '#EC4899',
  '#8B5CF6',
  '#FFFFFF',
];

function createStarterFrames(): string[] {
  // Generate 2 cute bouncing star/ball starter frames so kids immediately see how flipbooks work
  const frames: string[] = [];
  const offsets = [0, -28];
  for (let i = 0; i < 2; i++) {
    const c = document.createElement('canvas');
    c.width = CANVAS_PIXEL_WIDTH;
    c.height = CANVAS_PIXEL_HEIGHT;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, c.width, c.height);

      const cy = 540 + offsets[i] * 2;
      const cx = 600;
      // Ground shadow
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.ellipse(cx, 740, i === 0 ? 110 : 80, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cute character circle
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 130, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Eyes
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(cx - 42, cy - 22, 14, 0, Math.PI * 2);
      ctx.arc(cx + 42, cy - 22, 14, 0, Math.PI * 2);
      ctx.fill();

      // Happy smile
      ctx.beginPath();
      if (i === 0) {
        ctx.arc(cx, cy + 12, 42, 0.15 * Math.PI, 0.85 * Math.PI);
      } else {
        ctx.arc(cx, cy + 20, 32, 0, Math.PI * 2);
      }
      ctx.stroke();

      // Waving little arms
      ctx.beginPath();
      ctx.moveTo(cx - 128, cy + 10);
      ctx.quadraticCurveTo(cx - 190, i === 0 ? cy - 20 : cy - 80, cx - 210, i === 0 ? cy - 45 : cy - 110);
      ctx.moveTo(cx + 128, cy + 10);
      ctx.quadraticCurveTo(cx + 190, i === 0 ? cy - 20 : cy - 80, cx + 210, i === 0 ? cy - 45 : cy - 110);
      ctx.stroke();
    }
    frames.push(c.toDataURL('image/png'));
  }
  return frames;
}

export const FlipbookStudio: React.FC<FlipbookStudioProps> = ({
  initialFrameUrl,
  initialTitle = 'Mijn Flipboek Animatie',
  onSaveAnimation,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [frames, setFrames] = useState<string[]>(() => {
    if (initialFrameUrl) {
      return [initialFrameUrl, initialFrameUrl];
    }
    return createStarterFrames();
  });
  const [activeFrameIdx, setActiveFrameIdx] = useState<number>(0);
  const [title, setTitle] = useState<string>(initialTitle);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackIdx, setPlaybackIdx] = useState<number>(0);
  const [fps, setFps] = useState<number>(4);
  const [onionSkin, setOnionSkin] = useState<boolean>(true);
  const [motionPreset, setMotionPreset] = useState<MotionPreset>('none');

  const [tool, setTool] = useState<'marker' | 'fill' | 'eraser'>('marker');
  const [color, setColor] = useState<string>('#1E293B');
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const isDrawingRef = useRef<boolean>(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);

  // Sync incoming initialFrameUrl if user navigated from studio
  useEffect(() => {
    if (initialFrameUrl) {
      setFrames([initialFrameUrl, initialFrameUrl]);
      setActiveFrameIdx(0);
      setTitle(initialTitle);
      setIsPlaying(false);
    }
  }, [initialFrameUrl, initialTitle]);

  // Load active frame onto drawing canvas
  const loadFrameToCanvas = useCallback((frameUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!frameUrl) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = frameUrl;
  }, []);

  useEffect(() => {
    if (!isPlaying && frames[activeFrameIdx]) {
      loadFrameToCanvas(frames[activeFrameIdx]);
    }
  }, [activeFrameIdx, frames, isPlaying, loadFrameToCanvas]);

  // Flipbook playback timer
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;
    const intervalMs = Math.round(1000 / fps);
    const id = window.setInterval(() => {
      setPlaybackIdx((prev) => (prev + 1) % frames.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [isPlaying, fps, frames.length]);

  const commitCanvasToActiveFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = exportCanvasWithWhiteBg(canvas);
    setFrames((prev) => prev.map((f, idx) => (idx === activeFrameIdx ? url : f)));
  };

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_PIXEL_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_PIXEL_HEIGHT,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPlaying) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;

    const pt = getCoords(e);
    if (tool === 'fill') {
      if (floodFillCanvas(ctx, pt.x, pt.y, color)) {
        commitCanvasToActiveFrame();
        soundFX.playPop(620);
      }
      return;
    }

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    lastPtRef.current = pt;

    ctx.save();
    ctx.beginPath();
    ctx.arc(
      pt.x,
      pt.y,
      tool === 'eraser' ? 12 * CANVAS_SCALE : 3.5 * CANVAS_SCALE,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = tool === 'eraser' ? '#FFFFFF' : color;
    ctx.fill();
    ctx.restore();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isPlaying || !lastPtRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;

    const pt = getCoords(e);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
    ctx.lineWidth = tool === 'eraser' ? 24 * CANVAS_SCALE : 7 * CANVAS_SCALE;
    ctx.beginPath();
    ctx.moveTo(lastPtRef.current.x, lastPtRef.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();
    lastPtRef.current = pt;
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPtRef.current = null;
    commitCanvasToActiveFrame();
  };

  const createBlankFrameUrl = (): string => {
    const c = document.createElement('canvas');
    c.width = CANVAS_PIXEL_WIDTH;
    c.height = CANVAS_PIXEL_HEIGHT;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, c.width, c.height);
    }
    return c.toDataURL('image/png');
  };

  const handleAddBlankFrame = () => {
    if (frames.length >= 6) return;
    const next = [...frames, createBlankFrameUrl()];
    setFrames(next);
    setActiveFrameIdx(next.length - 1);
    setIsPlaying(false);
    soundFX.playPop(580);
  };

  const handleDuplicateFrame = () => {
    if (frames.length >= 6) return;
    const copy = frames[activeFrameIdx];
    const next = [
      ...frames.slice(0, activeFrameIdx + 1),
      copy,
      ...frames.slice(activeFrameIdx + 1),
    ];
    setFrames(next);
    setActiveFrameIdx(activeFrameIdx + 1);
    setIsPlaying(false);
    soundFX.playPop(640);
  };

  const handleDeleteFrame = (idx: number) => {
    if (frames.length <= 1) return;
    const next = frames.filter((_, i) => i !== idx);
    setFrames(next);
    setActiveFrameIdx(Math.min(activeFrameIdx, next.length - 1));
    setIsPlaying(false);
    soundFX.playPop(380);
  };

  const handleSave = () => {
    onSaveAnimation(frames, title.trim() || 'Mijn Flipboek', fps, motionPreset);
    soundFX.playLessonCelebrate();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2800);
  };

  const previousFrameUrl = activeFrameIdx > 0 ? frames[activeFrameIdx - 1] : null;

  const getMotionClass = () => {
    if (!isPlaying) return '';
    if (motionPreset === 'bounce') return 'animate-bounce';
    if (motionPreset === 'wiggle') return 'animate-[wiggle_0.6s_ease-in-out_infinite]';
    if (motionPreset === 'float') return 'animate-[float_1.8s_ease-in-out_infinite]';
    return '';
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Custom keyframes for playful motion presets */}
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-2.5deg); }
          50% { transform: rotate(2.5deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>

      {/* Top Action Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
            <Film className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="anim-title" className="sr-only">
              Titel van je animatie
            </label>
            <input
              id="anim-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={40}
              className="w-full max-w-xs rounded-lg border border-transparent bg-transparent px-2 py-1 font-display text-lg font-bold text-slate-900 hover:border-slate-200 focus:border-sky-500 focus:bg-white focus:outline-none"
            />
            <p className="px-2 text-xs text-slate-500">
              Flipboek Animatie Studio · {frames.length} van maximaal 6 frames
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setIsPlaying((p) => !p);
              setPlaybackIdx(0);
              soundFX.playPop(600);
            }}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-sky-600 hover:bg-sky-700'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4" />
                <span>Pauzeer animatie</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Speel animatie af</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 whitespace-nowrap shrink-0"
          >
            <Save className="h-4 w-4" />
            <span>Opslaan</span>
          </button>
        </div>
      </div>

      {savedNotice && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800"
        >
          Je animatie is opgeslagen in Mijn Tekeningen!
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* LEFT STAGE: Flipbook Canvas or Live Playback */}
        <div className="flex flex-col gap-4 lg:col-span-8">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="relative aspect-[600/480] w-full bg-white">
              {isPlaying ? (
                <div className="flex h-full w-full items-center justify-center overflow-hidden bg-white p-4">
                  <img
                    src={frames[playbackIdx]}
                    alt={`Animatie frame ${playbackIdx + 1}`}
                    referrerPolicy="no-referrer"
                    className={`h-full w-full object-contain ${getMotionClass()}`}
                  />
                </div>
              ) : (
                <>
                  {/* Onion skin preview of previous frame */}
                  {onionSkin && previousFrameUrl && (
                    <img
                      src={previousFrameUrl}
                      alt=""
                      aria-hidden="true"
                      referrerPolicy="no-referrer"
                      className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain opacity-25 mix-blend-multiply"
                    />
                  )}
                  <canvas
                    ref={canvasRef}
                    width={CANVAS_PIXEL_WIDTH}
                    height={CANVAS_PIXEL_HEIGHT}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{ touchAction: 'none' }}
                    className={`relative z-20 h-full w-full ${
                      onionSkin && previousFrameUrl ? 'opacity-90' : 'opacity-100'
                    } ${tool === 'fill' ? 'cursor-cell' : 'cursor-crosshair'}`}
                  />
                </>
              )}
            </div>
          </div>

          {/* Flipbook Frames Strip */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800">
                Tekenframes ({activeFrameIdx + 1} geselecteerd)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDuplicateFrame}
                  disabled={frames.length >= 6}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 whitespace-nowrap"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Kopieer frame</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddBlankFrame}
                  disabled={frames.length >= 6}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 border border-sky-200 hover:bg-sky-100 disabled:opacity-40 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nieuw leeg frame</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {frames.map((frameUrl, idx) => {
                const isSelected = isPlaying ? playbackIdx === idx : activeFrameIdx === idx;
                return (
                  <div key={idx} className="group relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setActiveFrameIdx(idx);
                      }}
                      className={`block w-full overflow-hidden rounded-xl border-2 bg-white transition-all ${
                        isSelected
                          ? 'border-sky-600 ring-2 ring-sky-200'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="aspect-[600/480] w-full bg-white">
                        <img
                          src={frameUrl}
                          alt={`Frame ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="border-t border-slate-100 bg-slate-50 py-1 text-center font-mono text-xs font-semibold tabular-nums text-slate-600">
                        Frame {idx + 1}
                      </div>
                    </button>

                    {frames.length > 1 && !isPlaying && (
                      <button
                        type="button"
                        onClick={() => handleDeleteFrame(idx)}
                        aria-label={`Verwijder frame ${idx + 1}`}
                        className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-rose-600 shadow-xs hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT CONTROL DECK */}
        <aside className="flex flex-col gap-4 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <MascotGuide
              mood={isPlaying ? 'celebrating' : 'idle'}
              message={
                isPlaying
                  ? 'Kijk eens hoe jouw tekening tot leven komt! Probeer ook eens een ander bewegingseffect!'
                  : 'Teken op elk frame een klein verschil, of klik op "Kopieer frame" en laat een arm zwaaien!'
              }
              speakerName="Kleo's Animatietip"
            />

            {/* Drawing Tools inside Flipbook */}
            <div className="mt-5 border-t border-slate-100 pt-5">
              <span className="mb-2 block text-xs font-semibold text-slate-600">
                Tekengereedschap voor dit frame
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTool('marker')}
                  className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    tool === 'marker'
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <PenTool className="h-4 w-4" />
                  <span>Stift</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTool('fill')}
                  className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    tool === 'fill'
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <PaintBucket className="h-4 w-4" />
                  <span>Emmer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTool('eraser')}
                  className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    tool === 'eraser'
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Eraser className="h-4 w-4" />
                  <span>Gum</span>
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {ANIM_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => {
                      setColor(hex);
                      if (tool === 'eraser') setTool('marker');
                    }}
                    aria-label={`Kies kleur ${hex}`}
                    className={`h-9 w-9 rounded-full border transition-transform ${
                      color === hex && tool !== 'eraser'
                        ? 'scale-110 border-slate-900 ring-2 ring-sky-500 ring-offset-2'
                        : 'border-slate-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            {/* Onion Skin & Speed */}
            <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-800">Vorige frame zien</span>
                  <p className="text-xs text-slate-500">Handig voor overtekenen (uienschil)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOnionSkin((v) => !v)}
                  aria-pressed={onionSkin}
                  className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    onionSkin
                      ? 'border-sky-300 bg-sky-50 text-sky-900'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>{onionSkin ? 'Aan' : 'Uit'}</span>
                </button>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Afspeelsnelheid
                </span>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                  {[
                    { value: 2, label: 'Rustig' },
                    { value: 4, label: 'Normaal' },
                    { value: 7, label: 'Snel' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFps(opt.value)}
                      className={`min-h-[36px] rounded-md px-2 text-xs font-semibold transition-colors ${
                        fps === opt.value
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Extra bewegingseffect</span>
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'none', label: 'Alleen frames' },
                      { id: 'bounce', label: 'Vrolijk springen' },
                      { id: 'wiggle', label: 'Gezellig wiebelen' },
                      { id: 'float', label: 'Zacht zweven' },
                    ] as const
                  ).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setMotionPreset(preset.id)}
                      className={`min-h-[40px] rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                        motionPreset === preset.id
                          ? 'border-sky-300 bg-sky-50 text-sky-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
