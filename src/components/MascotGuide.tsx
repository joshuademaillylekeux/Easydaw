import React from 'react';

interface MascotGuideProps {
  mood?: 'idle' | 'animating' | 'celebrating';
  message: string;
  speakerName?: string;
}

export const MascotGuide: React.FC<MascotGuideProps> = ({
  mood = 'idle',
  message,
  speakerName = 'Kleo de Tekenvriend',
}) => {
  return (
    <div className="flex items-start gap-3.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
      <div
        className={`shrink-0 transition-transform duration-300 ${
          mood === 'celebrating' ? '-translate-y-1 scale-105' : ''
        }`}
        aria-hidden="true"
      >
        <svg
          width="54"
          height="54"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-xs"
        >
          {/* Soft circular backdrop */}
          <circle cx="32" cy="34" r="27" fill="#E0F2FE" stroke="#BAE6FD" strokeWidth="2" />
          {/* Cute round chameleon/bear artist head */}
          <circle cx="32" cy="36" r="17" fill="#34D399" stroke="#065F46" strokeWidth="2.2" />
          {/* Painter's beret */}
          <path
            d="M17 24C17 16 25 12 34 13C43 14 48 19 46 25C40 27 23 27 17 24Z"
            fill="#0284C7"
            stroke="#0F172A"
            strokeWidth="2"
          />
          <circle cx="33" cy="12" r="2.5" fill="#0F172A" />
          {/* Big friendly eyes */}
          <circle cx="25.5" cy="34" r="4.2" fill="#FFFFFF" stroke="#065F46" strokeWidth="1.6" />
          <circle cx="38.5" cy="34" r="4.2" fill="#FFFFFF" stroke="#065F46" strokeWidth="1.6" />
          <circle cx="26.2" cy="34" r="2" fill="#0F172A" />
          <circle cx="39.2" cy="34" r="2" fill="#0F172A" />
          {/* Rosy cheeks */}
          <ellipse cx="20.5" cy="40" rx="3" ry="1.8" fill="#FDA4AF" />
          <ellipse cx="43.5" cy="40" rx="3" ry="1.8" fill="#FDA4AF" />
          {/* Smile */}
          {mood === 'celebrating' ? (
            <path
              d="M26 41C28 45.5 36 45.5 38 41Z"
              fill="#F43F5E"
              stroke="#065F46"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M27 41.5C29.5 44.5 34.5 44.5 37 41.5"
              stroke="#065F46"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          )}
          {/* Tiny paintbrush */}
          <path d="M47 46L56 32" stroke="#92400E" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M55 33L59 27C60 29 59 33 56 35Z" fill="#F59E0B" stroke="#0F172A" strokeWidth="1.4" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-sky-700">{speakerName}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">{message}</p>
      </div>
    </div>
  );
};
