import React from 'react';
import { DrawingLesson } from '../types/drawing';

interface LessonThumbnailProps {
  lesson: DrawingLesson;
  className?: string;
}

export const LessonThumbnail: React.FC<LessonThumbnailProps> = ({
  lesson,
  className = '',
}) => {
  return (
    <svg
      viewBox="0 0 600 480"
      className={`h-full w-full select-none ${className}`}
      aria-label={`Voorbeeldtekening van ${lesson.title}`}
      role="img"
    >
      <rect width="600" height="480" fill="#FFFFFF" />
      {/* Colored fills */}
      {lesson.previewFills.map((item, idx) => (
        <path key={`fill-${idx}`} d={item.d} fill={item.fill} />
      ))}
      {/* Crisp outlines from all steps */}
      {lesson.steps.map((step) =>
        step.strokes.map((stroke, idx) => (
          <path
            key={`${step.id}-${idx}`}
            d={stroke.d}
            fill="none"
            stroke={stroke.strokeColor ?? step.suggestedColor ?? '#1E293B'}
            strokeWidth={stroke.strokeWidth ?? 5.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))
      )}
    </svg>
  );
};
