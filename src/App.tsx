import { useEffect, useState } from 'react';
import { DrawingStudio } from './components/DrawingStudio';
import { FlipbookStudio } from './components/FlipbookStudio';
import { GalleryView } from './components/GalleryView';
import { LessonsHome } from './components/LessonsHome';
import { DRAWING_LESSONS } from './data/lessons';
import { AppView, DrawingLesson, MotionPreset, SavedArtwork } from './types/drawing';
import { soundFX } from './utils/soundEffects';

const COMPLETED_STORAGE_KEY = 'tekenpret_completed_v1';
const ARTWORKS_STORAGE_KEY = 'tekenpret_artworks_v1';

export default function App() {
  const [view, setView] = useState<AppView>('lessons');
  const [activeLesson, setActiveLesson] = useState<DrawingLesson | null>(null);
  const [studioInitialUrl, setStudioInitialUrl] = useState<string | null>(null);
  const [animateInitialUrl, setAnimateInitialUrl] = useState<string | null>(null);
  const [animateInitialTitle, setAnimateInitialTitle] = useState<string>('Mijn Flipboek');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [artworks, setArtworks] = useState<SavedArtwork[]>(() => {
    try {
      const raw = localStorage.getItem(ARTWORKS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SavedArtwork[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    soundFX.enabled = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(completedLessonIds));
    } catch {
      // Ignore storage quota issues
    }
  }, [completedLessonIds]);

  useEffect(() => {
    try {
      localStorage.setItem(ARTWORKS_STORAGE_KEY, JSON.stringify(artworks));
    } catch {
      // Ignore storage quota issues
    }
  }, [artworks]);

  const handleSelectLesson = (lesson: DrawingLesson) => {
    setActiveLesson(lesson);
    setStudioInitialUrl(null);
    setView('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartFreeDraw = () => {
    setActiveLesson(null);
    setStudioInitialUrl(null);
    setView('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLessonCompleted = (lessonId: string) => {
    setCompletedLessonIds((prev) =>
      prev.includes(lessonId) ? prev : [...prev, lessonId]
    );
  };

  const handleSaveArtwork = (dataUrl: string, title: string, lessonId?: string) => {
    const newItem: SavedArtwork = {
      id: `art-${Date.now()}`,
      title,
      lessonId,
      dataUrl,
      createdAt: Date.now(),
      isAnimated: false,
    };
    setArtworks((prev) => [newItem, ...prev]);
  };

  const handleSaveAnimation = (
    frames: string[],
    title: string,
    fps: number,
    motionPreset: MotionPreset
  ) => {
    const newItem: SavedArtwork = {
      id: `anim-${Date.now()}`,
      title,
      dataUrl: frames[0] ?? '',
      frames,
      fps,
      motionPreset,
      createdAt: Date.now(),
      isAnimated: true,
    };
    setArtworks((prev) => [newItem, ...prev]);
  };

  const handleSendToAnimate = (dataUrl: string, title: string) => {
    setAnimateInitialUrl(dataUrl);
    setAnimateInitialTitle(title);
    setView('animate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleContinueDrawing = (art: SavedArtwork) => {
    const matchedLesson = art.lessonId
      ? DRAWING_LESSONS.find((l) => l.id === art.lessonId) ?? null
      : null;
    setActiveLesson(matchedLesson);
    setStudioInitialUrl(art.dataUrl);
    setView('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnimateFromGallery = (art: SavedArtwork) => {
    setAnimateInitialUrl(art.dataUrl);
    setAnimateInitialTitle(art.title);
    setView('animate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteArtwork = (id: string) => {
    setArtworks((prev) => prev.filter((a) => a.id !== id));
  };

  const navLinkClass = (active: boolean) =>
    `whitespace-nowrap shrink-0 border-b-2 py-1 text-sm font-semibold transition-colors ${
      active
        ? 'border-sky-600 text-slate-900'
        : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setView('lessons')}
            className="font-display text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-600"
          >
            TekenPret
          </button>

          {/* Zone 2: Concise single-line nav links */}
          <nav
            aria-label="Hoofdnavigatie"
            className="hidden md:flex items-center gap-6"
          >
            <button
              type="button"
              onClick={() => setView('lessons')}
              className={navLinkClass(view === 'lessons')}
            >
              Tekenlessen
            </button>
            <button
              type="button"
              onClick={handleStartFreeDraw}
              className={navLinkClass(view === 'studio' && activeLesson === null)}
            >
              Vrij Tekenen
            </button>
            <button
              type="button"
              onClick={() => {
                setAnimateInitialUrl(null);
                setAnimateInitialTitle('Mijn Flipboek');
                setView('animate');
              }}
              className={navLinkClass(view === 'animate')}
            >
              Animatie Studio
            </button>
            <button
              type="button"
              onClick={() => setView('gallery')}
              className={navLinkClass(view === 'gallery')}
            >
              Mijn Tekeningen
            </button>
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => handleSelectLesson(activeLesson ?? DRAWING_LESSONS[0])}
              className="inline-flex min-h-[40px] items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 whitespace-nowrap shrink-0"
            >
              Start Tekenles
            </button>
          </div>
        </div>

        {/* Mobile navigation row */}
        <nav
          aria-label="Mobiele navigatie"
          className="flex md:hidden items-center justify-between gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2"
        >
          <button
            type="button"
            onClick={() => setView('lessons')}
            className={navLinkClass(view === 'lessons')}
          >
            Tekenlessen
          </button>
          <button
            type="button"
            onClick={handleStartFreeDraw}
            className={navLinkClass(view === 'studio' && activeLesson === null)}
          >
            Vrij Tekenen
          </button>
          <button
            type="button"
            onClick={() => setView('animate')}
            className={navLinkClass(view === 'animate')}
          >
            Animatie Studio
          </button>
          <button
            type="button"
            onClick={() => setView('gallery')}
            className={navLinkClass(view === 'gallery')}
          >
            Mijn Tekeningen
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {view === 'lessons' && (
          <LessonsHome
            lessons={DRAWING_LESSONS}
            completedLessonIds={completedLessonIds}
            onSelectLesson={handleSelectLesson}
            onStartFreeDraw={handleStartFreeDraw}
            onOpenAnimate={() => {
              setAnimateInitialUrl(null);
              setAnimateInitialTitle('Mijn Flipboek');
              setView('animate');
            }}
          />
        )}

        {view === 'studio' && (
          <DrawingStudio
            lesson={activeLesson}
            initialDataUrl={studioInitialUrl}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((s) => !s)}
            onBackToLessons={() => setView('lessons')}
            onSaveArtwork={handleSaveArtwork}
            onSendToAnimate={handleSendToAnimate}
            onLessonCompleted={handleLessonCompleted}
          />
        )}

        {view === 'animate' && (
          <FlipbookStudio
            initialFrameUrl={animateInitialUrl}
            initialTitle={animateInitialTitle}
            onSaveAnimation={handleSaveAnimation}
          />
        )}

        {view === 'gallery' && (
          <GalleryView
            artworks={artworks}
            onContinueDrawing={handleContinueDrawing}
            onAnimateArtwork={handleAnimateFromGallery}
            onDeleteArtwork={handleDeleteArtwork}
            onGoToLessons={() => setView('lessons')}
          />
        )}
      </main>

      {/* Quiet Safe Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 text-xs text-slate-500 sm:px-6 lg:px-8">
          <p>TekenPret · Veilig leren tekenen en animeren voor kinderen en beginners</p>
          <p>Geen reclame · Geen account nodig · Tekeningen blijven veilig op dit apparaat</p>
        </div>
      </footer>
    </div>
  );
}
