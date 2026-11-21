import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  CheckCircle2,
  Download,
  Eraser,
  Eye,
  Film,
  Grid,
  PaintBucket,
  Pause,
  Pencil,
  PenTool,
  Play,
  Redo2,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  AnimationSpeed,
  DrawingLesson,
  DrawTool,
  GuideVisibility,
} from '../types/drawing';
import {
  CANVAS_PIXEL_HEIGHT,
  CANVAS_PIXEL_WIDTH,
  CANVAS_SCALE,
  downloadDataUrl,
  exportCanvasWithWhiteBg,
  floodFillCanvas,
} from '../utils/canvasHelpers';
import { soundFX } from '../utils/soundEffects';
import { AnimatedStepOverlay } from './AnimatedStepOverlay';
import { MascotGuide } from './MascotGuide';

interface DrawingStudioProps {
  lesson: DrawingLesson | null;
  initialDataUrl?: string | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onBackToLessons: () => void;
  onSaveArtwork: (dataUrl: string, title: string, lessonId?: string) => void;
  onSendToAnimate: (dataUrl: string, title: string) => void;
  onLessonCompleted: (lessonId: string) => void;
}

const FULL_PALETTE = [
  { hex: '#1E293B', label: 'Zwart' },
  { hex: '#78350F', label: 'Bruin' },
  { hex: '#EF4444', label: 'Rood' },
  { hex: '#F97316', label: 'Oranje' },
  { hex: '#FACC15', label: 'Geel' },
  { hex: '#22C55E', label: 'Groen' },
  { hex: '#0284C7', label: 'Blauw' },
  { hex: '#38BDF8', label: 'Hemelblauw' },
  { hex: '#8B5CF6', label: 'Paars' },
  { hex: '#EC4899', label: 'Roze' },
  { hex: '#94A3B8', label: 'Grijs' },
  { hex: '#FFFFFF', label: 'Wit' },
];

const SIMPLE_PALETTE = [
  { hex: '#1E293B', label: 'Zwart' },
  { hex: '#EF4444', label: 'Rood' },
  { hex: '#FACC15', label: 'Geel' },
  { hex: '#22C55E', label: 'Groen' },
  { hex: '#0284C7', label: 'Blauw' },
  { hex: '#EC4899', label: 'Roze' },
];

const FREE_DRAW_PROMPTS = [
  {
    title: 'Een blij monster',
    tip: 'Teken een grote harige cirkel, geef hem drie grappige ogen en een grote glimlach!',
  },
  {
    title: 'Jouw droomhuis',
    tip: 'Begin met een vierkant voor de muren, zet er een puntdak op en teken bloemen in de tuin.',
  },
  {
    title: 'Onderwaterfeest',
    tip: 'Teken vrolijke visjes met driehoekige staarten en heel veel zwevende luchtbelletjes!',
  },
];

export const DrawingStudio: React.FC<DrawingStudioProps> = ({
  lesson,
  initialDataUrl,
  soundEnabled,
  onToggleSound,
  onBackToLessons,
  onSaveArtwork,
  onSendToAnimate,
  onLessonCompleted,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Drawing tool state
  const [activeTool, setActiveTool] = useState<DrawTool>('marker');
  const [activeColor, setActiveColor] = useState<string>(
    lesson?.steps[0]?.suggestedColor ?? '#1E293B'
  );
  const [brushSize, setBrushSize] = useState<number>(6);
  const [easyMode, setEasyMode] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(false);

  // History stack for Undo/Redo
  const historyRef = useRef<ImageData[]>([]);
  const historyIdxRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Guided step state
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [guideVisibility, setGuideVisibility] = useState<GuideVisibility>('clear');
  const [animationSpeed, setAnimationSpeed] = useState<AnimationSpeed>('normal');
  const [replayTrigger, setReplayTrigger] = useState<number>(1);
  const [playFullSequence, setPlayFullSequence] = useState<boolean>(false);
  const [isStepAnimating, setIsStepAnimating] = useState<boolean>(false);
  const [showColorPreview, setShowColorPreview] = useState<boolean>(false);
  const [lessonFinished, setLessonFinished] = useState<boolean>(false);

  // Inline UI confirmations & feedback
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [freePromptIdx, setFreePromptIdx] = useState<number>(0);

  // Pointer drawing refs
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const midPointRef = useRef<{ x: number; y: number } | null>(null);

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
  }, []);

  const pushSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const nextHistory = historyRef.current.slice(0, historyIdxRef.current + 1);
    nextHistory.push(snap);
    if (nextHistory.length > 30) {
      nextHistory.shift();
    }
    historyRef.current = nextHistory;
    historyIdxRef.current = nextHistory.length - 1;
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  // Initialize blank canvas or load initialDataUrl
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
        historyIdxRef.current = 0;
        syncHistoryFlags();
      };
      img.src = initialDataUrl;
    } else {
      historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
      historyIdxRef.current = 0;
      syncHistoryFlags();
    }
  }, [lesson?.id, initialDataUrl, syncHistoryFlags]);

  // Reset step state when changing lessons
  useEffect(() => {
    setCurrentStepIdx(0);
    setLessonFinished(false);
    setPlayFullSequence(false);
    setShowColorPreview(false);
    setReplayTrigger((t) => t + 1);
    if (lesson?.steps[0]?.suggestedColor) {
      setActiveColor(lesson.steps[0].suggestedColor);
    }
  }, [lesson?.id]);

  // Update suggested color when advancing steps if user hasn't picked eraser
  const goToStep = (nextIdx: number) => {
    if (!lesson) return;
    const clamped = Math.max(0, Math.min(lesson.steps.length - 1, nextIdx));
    setPlayFullSequence(false);
    setCurrentStepIdx(clamped);
    setReplayTrigger((t) => t + 1);
    const suggested = lesson.steps[clamped]?.suggestedColor;
    if (suggested && activeTool !== 'eraser') {
      setActiveColor(suggested);
    }
    soundFX.playStepComplete();
  };

  const handleFinishLesson = () => {
    if (!lesson) return;
    setLessonFinished(true);
    setPlayFullSequence(false);
    onLessonCompleted(lesson.id);
    soundFX.playLessonCelebrate();
  };

  const handleUndo = () => {
    if (historyIdxRef.current <= 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    historyIdxRef.current -= 1;
    ctx.putImageData(historyRef.current[historyIdxRef.current], 0, 0);
    syncHistoryFlags();
    soundFX.playPop(420);
  };

  const handleRedo = () => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    historyIdxRef.current += 1;
    ctx.putImageData(historyRef.current[historyIdxRef.current], 0, 0);
    syncHistoryFlags();
    soundFX.playPop(580);
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pushSnapshot();
    setConfirmClear(false);
    soundFX.playPop(340);
  };

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_PIXEL_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_PIXEL_HEIGHT;
    return { x, y };
  };

  const drawCrayonSegment = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    size: number,
    color: string
  ) => {
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(dist / 3));
    ctx.fillStyle = color;
    const radius = size * CANVAS_SCALE * 0.6;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = from.x + (to.x - from.x) * t;
      const cy = from.y + (to.y - from.y) * t;
      for (let d = 0; d < 7; d++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        ctx.globalAlpha = 0.25 + Math.random() * 0.45;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1.2, radius * 0.22), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const pt = getCanvasCoords(e);

    if (activeTool === 'fill') {
      const filled = floodFillCanvas(ctx, pt.x, pt.y, activeColor);
      if (filled) {
        pushSnapshot();
        soundFX.playPop(640);
      }
      return;
    }

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    lastPointRef.current = pt;
    midPointRef.current = pt;

    if (activeTool === 'crayon') {
      drawCrayonSegment(ctx, pt, pt, brushSize, activeColor);
      return;
    }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * CANVAS_SCALE * 2.2;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else if (activeTool === 'pencil') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.72;
      ctx.lineWidth = Math.max(2, brushSize * CANVAS_SCALE * 0.65);
      ctx.strokeStyle = activeColor;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.lineWidth = brushSize * CANVAS_SCALE;
      ctx.strokeStyle = activeColor;
    }
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = activeTool === 'eraser' ? 'rgba(0,0,0,1)' : activeColor;
    ctx.fill();
    ctx.restore();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx || !lastPointRef.current || !midPointRef.current) return;

    const pt = getCanvasCoords(e);

    if (activeTool === 'crayon') {
      drawCrayonSegment(ctx, lastPointRef.current, pt, brushSize, activeColor);
      lastPointRef.current = pt;
      return;
    }

    const newMid = {
      x: (lastPointRef.current.x + pt.x) / 2,
      y: (lastPointRef.current.y + pt.y) / 2,
    };

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * CANVAS_SCALE * 2.2;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else if (activeTool === 'pencil') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.72;
      ctx.lineWidth = Math.max(2, brushSize * CANVAS_SCALE * 0.65);
      ctx.strokeStyle = activeColor;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.lineWidth = brushSize * CANVAS_SCALE;
      ctx.strokeStyle = activeColor;
    }

    ctx.beginPath();
    ctx.moveTo(midPointRef.current.x, midPointRef.current.y);
    ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, newMid.x, newMid.y);
    ctx.stroke();
    ctx.restore();

    lastPointRef.current = pt;
    midPointRef.current = newMid;
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    midPointRef.current = null;
    pushSnapshot();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = exportCanvasWithWhiteBg(canvas);
    const title = lesson ? `Mijn ${lesson.title}` : 'Vrije Tekening';
    onSaveArtwork(dataUrl, title, lesson?.id);
    soundFX.playStepComplete();
    setSaveFeedback('Opgeslagen in Mijn Tekeningen!');
    setTimeout(() => setSaveFeedback(null), 2800);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = exportCanvasWithWhiteBg(canvas);
    const slug = lesson ? lesson.id : 'vrije-tekening';
    downloadDataUrl(dataUrl, `tekenpret-${slug}.png`);
    soundFX.playPop(680);
  };

  const handleToAnimate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = exportCanvasWithWhiteBg(canvas);
    const title = lesson ? `${lesson.characterName} Animatie` : 'Mijn Animatie';
    onSendToAnimate(dataUrl, title);
  };

  const currentStep = lesson ? lesson.steps[currentStepIdx] : null;
  const palette = easyMode ? SIMPLE_PALETTE : FULL_PALETTE;

  const mascotMessage = lesson
    ? lessonFinished
      ? `Wauw! Jouw ${lesson.characterName} is geweldig geworden! Kleur hem vrolijk in of breng hem tot leven in de Animatie Studio!`
      : currentStep?.mascotTip ?? lesson.characterIntro
    : FREE_DRAW_PROMPTS[freePromptIdx].tip;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
      {/* Studio Top Utility Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToLessons}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-600 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Alle lessen</span>
          </button>

          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-bold text-slate-900 sm:text-xl">
              {lesson ? lesson.title : 'Vrij Tekenbord'}
            </h1>
            <p className="text-xs text-slate-500">
              {lesson
                ? `${lesson.category} · ${lesson.steps.length} stappen · ${lesson.ageGroup}`
                : 'Laat je fantasie de vrije loop op jouw eigen tekenvel'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEasyMode((v) => !v);
              if (!easyMode && (activeTool === 'pencil' || activeTool === 'crayon')) {
                setActiveTool('marker');
              }
              soundFX.playPop(500);
            }}
            aria-pressed={easyMode}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
              easyMode
                ? 'border-amber-300 bg-amber-50 text-amber-900'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title="Schakel grote knoppen en 6 basiskleuren in voor jonge kinderen"
          >
            <Baby className="h-4 w-4" />
            <span>{easyMode ? 'Peutermodus: Aan' : 'Peutermodus'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGrid((g) => !g)}
            aria-pressed={showGrid}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              showGrid
                ? 'border-sky-300 bg-sky-50 text-sky-900'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Grid className="h-4 w-4" />
            <span className="hidden sm:inline">Hulpraster</span>
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            aria-pressed={soundEnabled}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            aria-label={soundEnabled ? 'Geluid uitzetten' : 'Geluid aanzetten'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-sky-600" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
            <span className="hidden md:inline">{soundEnabled ? 'Geluid aan' : 'Geluid uit'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 whitespace-nowrap shrink-0"
          >
            <Save className="h-4 w-4" />
            <span>Opslaan</span>
          </button>

          <button
            type="button"
            onClick={handleToAnimate}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 whitespace-nowrap shrink-0"
          >
            <Film className="h-4 w-4" />
            <span>Animeren</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 transition-colors hover:bg-slate-50 shrink-0"
            title="Download als PNG afbeelding"
            aria-label="Download als PNG afbeelding"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {saveFeedback && (
        <div
          role="status"
          className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* Two-Zone Sandbox Layout: Left Interactive Canvas (66%) + Right Concept & Step Deck (34%) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* LEFT ZONE: Drawing Canvas & Tactile Tools */}
        <div className="flex flex-col gap-4 lg:col-span-8">
          {/* Direct Step-by-Step Navigation Bar above the Drawing Example */}
          {lesson && currentStep && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
              <button
                type="button"
                onClick={() => goToStep(currentStepIdx - 1)}
                disabled={currentStepIdx === 0}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Terug</span>
              </button>

              <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                <span className="font-mono text-xs font-semibold tabular-nums text-sky-700">
                  Stap {currentStepIdx + 1} van {lesson.steps.length}
                </span>
                <span className="max-w-full truncate font-display text-sm font-bold text-slate-900 sm:text-base">
                  {currentStep.title}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setPlayFullSequence(false);
                    setReplayTrigger((t) => t + 1);
                    soundFX.playPop(580);
                  }}
                  title="Speel deze stap opnieuw af"
                  aria-label="Speel deze stap opnieuw af"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-sky-200 bg-sky-50 px-3 text-sky-800 transition-colors hover:bg-sky-100"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                {currentStepIdx < lesson.steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => goToStep(currentStepIdx + 1)}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 whitespace-nowrap shrink-0"
                  >
                    <span>Verder</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishLesson}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 whitespace-nowrap shrink-0"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Klaar!</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Paper Stage */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div
              className={`relative aspect-[600/480] w-full ${
                showGrid ? 'sketch-dot-grid' : 'bg-white'
              }`}
            >
              {/* Subtle center guide cross when grid is active */}
              {showGrid && (
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                  <div className="absolute top-0 bottom-0 left-1/2 w-px border-l border-dashed border-slate-300/70" />
                  <div className="absolute right-0 left-0 top-1/2 h-px border-t border-dashed border-slate-300/70" />
                </div>
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
                className={`relative z-10 h-full w-full ${
                  activeTool === 'fill' ? 'cursor-cell' : 'cursor-crosshair'
                }`}
                aria-label="Tekenvel"
              />

              {/* Animated step-by-step ghost & moving pencil overlay */}
              {lesson && (
                <div className="pointer-events-none absolute inset-0 z-20">
                  <AnimatedStepOverlay
                    lesson={lesson}
                    currentStepIndex={currentStepIdx}
                    guideVisibility={guideVisibility}
                    animationSpeed={animationSpeed}
                    replayTrigger={replayTrigger}
                    playFullSequence={playFullSequence}
                    showColorPreview={showColorPreview}
                    onSequenceComplete={() => setPlayFullSequence(false)}
                    onAnimationStateChange={setIsStepAnimating}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bottom Tactile Drawing Tools & Color Dock */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-4">
              {/* Row 1: Tools, Sizes, History */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Tools */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveTool('marker')}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      activeTool === 'marker'
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <PenTool className="h-4 w-4" />
                    <span>Stift</span>
                  </button>

                  {!easyMode && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveTool('pencil')}
                        className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          activeTool === 'pencil'
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Pencil className="h-4 w-4" />
                        <span>Potlood</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTool('crayon')}
                        className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          activeTool === 'crayon'
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Krijt</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveTool('fill')}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      activeTool === 'fill'
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <PaintBucket className="h-4 w-4" />
                    <span>Inkleuren</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTool('eraser')}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      activeTool === 'eraser'
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Eraser className="h-4 w-4" />
                    <span>Gum</span>
                  </button>
                </div>

                {/* Brush Thickness + Undo/Redo/Clear */}
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
                    role="group"
                    aria-label="Lijndikte"
                  >
                    {[
                      { size: 3, dot: 6, label: 'Dun' },
                      { size: 6, dot: 10, label: 'Middel' },
                      { size: 12, dot: 16, label: 'Dik' },
                    ].map((b) => (
                      <button
                        key={b.label}
                        type="button"
                        onClick={() => setBrushSize(b.size)}
                        className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                          brushSize === b.size
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title={`Lijndikte: ${b.label}`}
                        aria-label={`Lijndikte ${b.label}`}
                        aria-pressed={brushSize === b.size}
                      >
                        <span
                          className="rounded-full bg-current"
                          style={{ width: b.dot, height: b.dot }}
                        />
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
                    title="Stap terug (Ongedaan maken)"
                    aria-label="Ongedaan maken"
                  >
                    <Undo2 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={!canRedo}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
                    title="Opnieuw"
                    aria-label="Opnieuw"
                  >
                    <Redo2 className="h-4 w-4" />
                  </button>

                  {!confirmClear ? (
                    <button
                      type="button"
                      onClick={() => setConfirmClear(true)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 whitespace-nowrap shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Wis blad</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1">
                      <span className="text-xs font-semibold text-rose-800">Alles wissen?</span>
                      <button
                        type="button"
                        onClick={handleClearCanvas}
                        className="rounded bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                      >
                        Ja
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className="rounded bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Nee
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Color Palette */}
              <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-3">
                <span className="mr-1 text-xs font-semibold text-slate-500">Kleuren:</span>
                {palette.map((color) => {
                  const isSelected = activeColor === color.hex && activeTool !== 'eraser';
                  return (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => {
                        setActiveColor(color.hex);
                        if (activeTool === 'eraser') setActiveTool('marker');
                        soundFX.playPop(540);
                      }}
                      title={color.label}
                      aria-label={`Kleur ${color.label}`}
                      aria-pressed={isSelected}
                      className={`relative rounded-full border transition-transform ${
                        easyMode ? 'h-11 w-11' : 'h-9 w-9'
                      } ${
                        isSelected
                          ? 'scale-110 border-slate-900 ring-2 ring-sky-500 ring-offset-2'
                          : 'border-slate-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT ZONE: Step-by-Step Animated Instructions & Concept Deck */}
        <aside className="flex flex-col gap-4 lg:col-span-4">
          {lesson && currentStep ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              {/* Mascot Encouraging Tip */}
              <MascotGuide
                mood={
                  lessonFinished ? 'celebrating' : isStepAnimating ? 'animating' : 'idle'
                }
                message={mascotMessage}
              />

              {/* Step Counter & Progress Dots */}
              <div className="mt-5 flex items-center justify-between">
                <span className="font-mono text-sm font-semibold tabular-nums text-sky-700">
                  Stap {currentStepIdx + 1} van {lesson.steps.length}
                </span>
                <div className="flex items-center gap-1.5" aria-label="Stappen overzicht">
                  {lesson.steps.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => goToStep(idx)}
                      aria-label={`Ga naar stap ${idx + 1}: ${s.title}`}
                      className={`h-2.5 rounded-full transition-all ${
                        idx === currentStepIdx
                          ? 'w-7 bg-sky-600'
                          : idx < currentStepIdx
                            ? 'w-2.5 bg-emerald-500'
                            : 'w-2.5 bg-slate-200 hover:bg-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Active Step Title & Instruction */}
              <div className="mt-4">
                <h2 className="font-display text-xl font-bold text-slate-900 text-balance">
                  {currentStep.title}
                </h2>
                <p className="mt-2 text-base leading-relaxed text-slate-600">
                  {currentStep.instruction}
                </p>
              </div>

              {/* Step Animation Playback Controls */}
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPlayFullSequence(false);
                    setReplayTrigger((t) => t + 1);
                    soundFX.playPop(580);
                  }}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2 text-sm font-semibold text-sky-800 transition-colors hover:bg-sky-100 whitespace-nowrap"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Speel stap opnieuw</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPlayFullSequence((p) => !p);
                    setReplayTrigger((t) => t + 1);
                  }}
                  className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    playFullSequence
                      ? 'border-amber-300 bg-amber-50 text-amber-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {playFullSequence ? (
                    <>
                      <Pause className="h-4 w-4" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      <span>Hele animatie</span>
                    </>
                  )}
                </button>
              </div>

              {/* Step Navigation Buttons */}
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => goToStep(currentStepIdx - 1)}
                  disabled={currentStepIdx === 0}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Terug</span>
                </button>

                {currentStepIdx < lesson.steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => goToStep(currentStepIdx + 1)}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 whitespace-nowrap"
                  >
                    <span>Verder</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishLesson}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Klaar!</span>
                  </button>
                )}
              </div>

              {/* Lesson Complete Celebration Panel */}
              {lessonFinished && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-display text-base font-bold text-emerald-900">
                    Super goed gedaan!
                  </p>
                  <p className="mt-1 text-sm text-emerald-800">
                    Je hebt {lesson.title} afgerond. Gebruik de Emmer-tool om in te kleuren, of laat je tekening bewegen!
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTool('fill');
                        setGuideVisibility('off');
                      }}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 border border-emerald-200 hover:bg-emerald-100"
                    >
                      <PaintBucket className="h-3.5 w-3.5" />
                      <span>Kleurplaat inkleuren</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleToAnimate}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <Film className="h-3.5 w-3.5" />
                      <span>Maak een animatie</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Guide & Speed Controls */}
              <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">Overteken-hulplijn</span>
                    <button
                      type="button"
                      onClick={() => setShowColorPreview((v) => !v)}
                      className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors ${
                        showColorPreview ? 'text-sky-700' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{showColorPreview ? 'Verberg kleuren' : 'Toon kleuren'}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                    {(
                      [
                        { id: 'off', label: 'Uit' },
                        { id: 'light', label: 'Licht' },
                        { id: 'clear', label: 'Duidelijk' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setGuideVisibility(opt.id)}
                        className={`min-h-[36px] rounded-md px-2 text-xs font-semibold transition-colors ${
                          guideVisibility === opt.id
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
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Snelheid van pen-animatie
                  </span>
                  <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                    {(
                      [
                        { id: 'slow', label: 'Langzaam' },
                        { id: 'normal', label: 'Normaal' },
                        { id: 'fast', label: 'Snel' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAnimationSpeed(opt.id)}
                        className={`min-h-[36px] rounded-md px-2 text-xs font-semibold transition-colors ${
                          animationSpeed === opt.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Free Drawing Mode Right Deck */
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <MascotGuide
                mood="idle"
                message={FREE_DRAW_PROMPTS[freePromptIdx].tip}
                speakerName="Kleo geeft een idee"
              />

              <div className="mt-5">
                <h2 className="font-display text-xl font-bold text-slate-900">
                  {FREE_DRAW_PROMPTS[freePromptIdx].title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  In het Vrij Tekenbord mag je alles tekenen wat je zelf verzint! Gebruik het emmertje om grote vlakken in één klik te vullen.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setFreePromptIdx((i) => (i + 1) % FREE_DRAW_PROMPTS.length);
                    soundFX.playPop(540);
                  }}
                  className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100"
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Geef een nieuw tekenidee</span>
                </button>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold text-slate-500">Klaar met tekenen?</p>
                <button
                  type="button"
                  onClick={handleToAnimate}
                  className="mt-2 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
                >
                  <Film className="h-4 w-4" />
                  <span>Laat tekening bewegen in Animatie Studio</span>
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
