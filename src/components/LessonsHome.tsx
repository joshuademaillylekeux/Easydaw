import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Film,
  Palette,
  PenTool,
  ShieldCheck,
} from 'lucide-react';
import heroStudioImg from '../assets/images/tekenpret_studio_hero_1795259984059.jpg';
import { DrawingLesson, LessonCategory } from '../types/drawing';
import { LessonThumbnail } from './LessonThumbnail';

interface LessonsHomeProps {
  lessons: DrawingLesson[];
  completedLessonIds: string[];
  onSelectLesson: (lesson: DrawingLesson) => void;
  onStartFreeDraw: () => void;
  onOpenAnimate: () => void;
}

const CATEGORIES: ('Alle' | LessonCategory)[] = [
  'Alle',
  'Dieren',
  'Ruimte',
  'Natuur',
  'Fantasie',
];

export const LessonsHome: React.FC<LessonsHomeProps> = ({
  lessons,
  completedLessonIds,
  onSelectLesson,
  onStartFreeDraw,
  onOpenAnimate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'Alle' | LessonCategory>('Alle');
  const [heroImgFailed, setHeroImgFailed] = useState<boolean>(false);

  const filteredLessons =
    selectedCategory === 'Alle'
      ? lessons
      : lessons.filter((l) => l.category === selectedCategory);

  const firstRecommended = lessons[0];

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Split Section */}
      <section className="grid grid-cols-1 items-stretch gap-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:grid-cols-12 lg:p-10">
        <div className="flex flex-col justify-center lg:col-span-6">
          <p className="text-sm font-semibold text-sky-700">
            Veilige tekenstudio voor kinderen en beginners
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
            Leer stap voor stap tekenen met vrolijke animaties
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            Kijk precies hoe een bewegend potlood elk lijntje voortekent, teken op je eigen tempo mee en breng je tekening daarna zelf tot leven in de Animatie Studio.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3.5">
            <button
              type="button"
              onClick={() => onSelectLesson(firstRecommended)}
              className="inline-flex min-h-[48px] items-center gap-2.5 rounded-xl bg-sky-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-sky-700 whitespace-nowrap shrink-0"
            >
              <span>Begin met {firstRecommended.characterName}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onStartFreeDraw}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-base font-semibold text-slate-800 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              <Palette className="h-4 w-4 text-sky-600" />
              <span>Vrij tekenen</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="relative h-64 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-80 lg:h-full lg:min-h-[320px]">
            {!heroImgFailed ? (
              <img
                src={heroStudioImg}
                alt="Een zonnige tekentafel met een schetsboek, kleurpotloden, kwasten en vrolijke getekende figuurtjes van een beer en een raket."
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-sky-50 to-amber-50 p-6 text-center">
                <PenTool className="h-12 w-12 text-sky-600" />
                <p className="mt-3 font-display text-lg font-bold text-slate-800">
                  Jouw eigen tekentafel
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Reassurance & Progress Strip */}
      <section
        aria-label="Kenmerken van TekenPret"
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <PenTool className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900">
              Bewegende hulplijnen
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              Zie per stap waar je begint en welke kant de lijn op gaat.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <Film className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900">
              Eigen Flipboek Studio
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              Laat jouw zelfgemaakte figuurtjes zwaaien, springen en bewegen.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900">
              100% veilig voor kinderen
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              Geen reclame, geen chat en geen account nodig. Alles blijft op je apparaat.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <Award className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900">
              Jouw voortgang
            </h2>
            <p className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-slate-700">
              {completedLessonIds.length} van {lessons.length} tekenlessen voltooid
            </p>
          </div>
        </div>
      </section>

      {/* Lesson Gallery Section */}
      <section className="mt-10" id="tekenlessen">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              Kies een vrolijke tekenles
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Klik op een karakter om stap voor stap te leren tekenen.
            </p>
          </div>

          {/* Interactive Category Filter Segmented Bar */}
          <div
            className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-200/70 p-1"
            role="tablist"
            aria-label="Filter tekenlessen op onderwerp"
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Lesson Cards Grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredLessons.map((lesson) => {
            const isCompleted = completedLessonIds.includes(lesson.id);
            return (
              <article
                key={lesson.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-transform duration-200 hover:-translate-y-0.5"
              >
                <button
                  type="button"
                  onClick={() => onSelectLesson(lesson)}
                  className="group block aspect-[600/420] w-full overflow-hidden border-b border-slate-100 bg-white p-3 text-left focus-visible:outline-2 focus-visible:outline-sky-600"
                >
                  <LessonThumbnail
                    lesson={lesson}
                    className="transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                </button>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      {lesson.category} · {lesson.steps.length} stappen · {lesson.difficulty}
                    </span>
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Voltooid</span>
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 font-display text-lg font-bold text-slate-900">
                    {lesson.title}
                  </h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-600">
                    {lesson.characterIntro}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5">
                    <span className="text-xs font-medium text-slate-500">
                      Leeftijd: {lesson.ageGroup}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectLesson(lesson)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-700 whitespace-nowrap shrink-0"
                    >
                      <span>{isCompleted ? 'Opnieuw tekenen' : 'Start les'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Bottom Invitation to Animation Studio */}
      <section className="mt-12 flex flex-col items-start justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
            Zelf een klein tekenfilmpje maken?
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
            Open de Flipboek Animatie Studio, teken een paar frames achter elkaar en zie hoe jouw figuurtje meteen gaat bewegen!
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAnimate}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          <Film className="h-4 w-4" />
          <span>Open Animatie Studio</span>
        </button>
      </section>
    </div>
  );
};
