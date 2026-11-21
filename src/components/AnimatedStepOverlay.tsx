import React, { useEffect, useRef, useState } from 'react';
import { AnimationSpeed, DrawingLesson, GuideVisibility } from '../types/drawing';

interface AnimatedStepOverlayProps {
  lesson: DrawingLesson;
  currentStepIndex: number;
  guideVisibility: GuideVisibility;
  animationSpeed: AnimationSpeed;
  replayTrigger: number;
  playFullSequence: boolean;
  showColorPreview: boolean;
  onSequenceComplete?: () => void;
  onAnimationStateChange?: (isAnimating: boolean) => void;
}

interface PenPosition {
  x: number;
  y: number;
  visible: boolean;
}

const SPEED_MULTIPLIER: Record<AnimationSpeed, number> = {
  slow: 1.75,
  normal: 1.0,
  fast: 0.55,
};

export const AnimatedStepOverlay: React.FC<AnimatedStepOverlayProps> = ({
  lesson,
  currentStepIndex,
  guideVisibility,
  animationSpeed,
  replayTrigger,
  playFullSequence,
  showColorPreview,
  onSequenceComplete,
  onAnimationStateChange,
}) => {
  const activeStepRefs = useRef<(SVGPathElement | null)[]>([]);
  const [penPos, setPenPos] = useState<PenPosition>({ x: 300, y: 240, visible: false });
  const [startDot, setStartDot] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [sequenceStepIdx, setSequenceStepIdx] = useState<number>(0);

  const effectiveStepIdx = playFullSequence ? sequenceStepIdx : currentStepIndex;
  const activeStep = lesson.steps[effectiveStepIdx];

  useEffect(() => {
    if (playFullSequence) {
      setSequenceStepIdx(0);
    }
  }, [playFullSequence, lesson.id, replayTrigger]);

  useEffect(() => {
    if (!activeStep) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const paths = activeStepRefs.current.slice(0, activeStep.strokes.length);
    const validPaths = paths.filter((p): p is SVGPathElement => p !== null);

    if (validPaths.length === 0) return;

    const lengths = validPaths.map((p) => {
      try {
        return p.getTotalLength();
      } catch {
        return 100;
      }
    });

    if (prefersReducedMotion) {
      validPaths.forEach((p) => {
        p.style.strokeDasharray = 'none';
        p.style.strokeDashoffset = '0';
      });
      setPenPos((prev) => ({ ...prev, visible: false }));
      setStartDot({ x: 0, y: 0, visible: false });
      return;
    }

    // Initialize all active step strokes hidden
    validPaths.forEach((p, idx) => {
      const len = lengths[idx];
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = `${len}`;
    });

    try {
      const firstPt = validPaths[0].getPointAtLength(0);
      setStartDot({ x: firstPt.x, y: firstPt.y, visible: true });
    } catch {
      setStartDot({ x: 0, y: 0, visible: false });
    }

    onAnimationStateChange?.(true);

    let rafId = 0;
    let strokeIdx = 0;
    let strokeStartTime = performance.now();
    const speedFactor = SPEED_MULTIPLIER[animationSpeed];

    const animateFrame = (now: number) => {
      if (strokeIdx >= validPaths.length) {
        setPenPos((prev) => ({ ...prev, visible: false }));
        onAnimationStateChange?.(false);
        if (playFullSequence) {
          if (sequenceStepIdx < lesson.steps.length - 1) {
            setTimeout(() => {
              setSequenceStepIdx((s) => s + 1);
            }, 350);
          } else {
            onSequenceComplete?.();
          }
        }
        return;
      }

      const path = validPaths[strokeIdx];
      const totalLen = Math.max(lengths[strokeIdx], 1);
      // Duration scales smoothly with stroke length
      const durationMs = Math.max(480, Math.min(1850, totalLen * 3.4)) * speedFactor;
      const elapsed = now - strokeStartTime;
      const rawT = Math.min(1, elapsed / durationMs);
      // Smooth ease-in-out
      const t = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

      const drawn = totalLen * t;
      path.style.strokeDashoffset = `${totalLen - drawn}`;

      try {
        const pt = path.getPointAtLength(drawn);
        setPenPos({ x: pt.x, y: pt.y, visible: true });
      } catch {
        // Ignore point lookup failure
      }

      if (rawT >= 1) {
        path.style.strokeDashoffset = '0';
        strokeIdx += 1;
        strokeStartTime = now + 110 * speedFactor;
        if (strokeIdx < validPaths.length) {
          try {
            const nextPt = validPaths[strokeIdx].getPointAtLength(0);
            setStartDot({ x: nextPt.x, y: nextPt.y, visible: true });
          } catch {
            // ignore
          }
        }
      }

      rafId = requestAnimationFrame(animateFrame);
    };

    rafId = requestAnimationFrame(animateFrame);

    return () => {
      cancelAnimationFrame(rafId);
      onAnimationStateChange?.(false);
    };
  }, [
    lesson.id,
    effectiveStepIdx,
    replayTrigger,
    animationSpeed,
    playFullSequence,
    sequenceStepIdx,
  ]);

  if (guideVisibility === 'off' && !playFullSequence && !showColorPreview) {
    return null;
  }

  const completedOpacity =
    guideVisibility === 'clear' ? 0.38 : guideVisibility === 'light' ? 0.18 : 0.25;
  const upcomingOpacity = guideVisibility === 'clear' ? 0.08 : 0;

  return (
    <svg
      viewBox="0 0 600 480"
      className="pointer-events-none absolute inset-0 h-full w-full select-none"
      aria-hidden="true"
    >
      {/* Optional full color preview */}
      {showColorPreview && (
        <g opacity={0.42}>
          {lesson.previewFills.map((item, i) => (
            <path key={`fill-${i}`} d={item.d} fill={item.fill} />
          ))}
        </g>
      )}

      {/* Faint ghost of upcoming steps if guide is set to clear */}
      {upcomingOpacity > 0 &&
        lesson.steps.slice(effectiveStepIdx + 1).map((step) => (
          <g key={step.id} opacity={upcomingOpacity}>
            {step.strokes.map((stroke, idx) => (
              <path
                key={idx}
                d={stroke.d}
                fill="none"
                stroke="#64748B"
                strokeWidth={stroke.strokeWidth ?? 4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="6 8"
              />
            ))}
          </g>
        ))}

      {/* Previously completed steps */}
      {lesson.steps.slice(0, effectiveStepIdx).map((step) => (
        <g key={step.id} opacity={playFullSequence ? 0.88 : completedOpacity}>
          {step.strokes.map((stroke, idx) => (
            <path
              key={idx}
              d={stroke.d}
              fill="none"
              stroke={stroke.strokeColor ?? step.suggestedColor ?? '#334155'}
              strokeWidth={stroke.strokeWidth ?? 4.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={playFullSequence ? 'none' : '8 6'}
            />
          ))}
        </g>
      ))}

      {/* Active step animated strokes */}
      {activeStep && (
        <g>
          {/* Soft tracing blueprint underneath active stroke */}
          {!playFullSequence && (
            <g opacity={guideVisibility === 'clear' ? 0.34 : 0.18}>
              {activeStep.strokes.map((stroke, idx) => (
                <path
                  key={`ghost-${idx}`}
                  d={stroke.d}
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth={stroke.strokeWidth ?? 5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="7 7"
                />
              ))}
            </g>
          )}

          {/* Animated solid stroke */}
          {activeStep.strokes.map((stroke, idx) => (
            <path
              key={`${activeStep.id}-stroke-${idx}`}
              ref={(el) => {
                activeStepRefs.current[idx] = el;
              }}
              d={stroke.d}
              fill="none"
              stroke={stroke.strokeColor ?? activeStep.suggestedColor ?? '#0284C7'}
              strokeWidth={stroke.strokeWidth ?? 5.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      )}

      {/* Start point indicator */}
      {startDot.visible && (
        <g transform={`translate(${startDot.x}, ${startDot.y})`}>
          <circle r="7" fill="#0284C7" opacity="0.22" />
          <circle r="4" fill="#0284C7" stroke="#FFFFFF" strokeWidth="1.5" />
        </g>
      )}

      {/* Animated gliding pencil */}
      {penPos.visible && (
        <g transform={`translate(${penPos.x}, ${penPos.y})`}>
          <g transform="translate(2, -34) rotate(22)">
            {/* Pencil shadow */}
            <ellipse cx="4" cy="36" rx="6" ry="2.2" fill="#0F172A" opacity="0.16" />
            {/* Pencil body */}
            <rect
              x="-5"
              y="0"
              width="10"
              height="24"
              rx="2"
              fill="#F59E0B"
              stroke="#0F172A"
              strokeWidth="1.8"
            />
            {/* Eraser cap */}
            <rect
              x="-5"
              y="-5"
              width="10"
              height="6"
              rx="2"
              fill="#FB7185"
              stroke="#0F172A"
              strokeWidth="1.8"
            />
            {/* Wooden cone */}
            <path d="M -5 24 L 0 34 L 5 24 Z" fill="#FDE68A" stroke="#0F172A" strokeWidth="1.8" strokeLinejoin="round" />
            {/* Pencil lead tip */}
            <path d="M -1.8 30.5 L 0 34 L 1.8 30.5 Z" fill="#0F172A" />
          </g>
        </g>
      )}
    </svg>
  );
};
