import React, { useEffect, useState } from 'react';
import {
  Download,
  Film,
  FolderOpen,
  PenTool,
  Trash2,
} from 'lucide-react';
import { SavedArtwork } from '../types/drawing';
import { downloadDataUrl } from '../utils/canvasHelpers';

interface GalleryViewProps {
  artworks: SavedArtwork[];
  onContinueDrawing: (artwork: SavedArtwork) => void;
  onAnimateArtwork: (artwork: SavedArtwork) => void;
  onDeleteArtwork: (id: string) => void;
  onGoToLessons: () => void;
}

const AnimatedArtworkPreview: React.FC<{ artwork: SavedArtwork }> = ({ artwork }) => {
  const [frameIdx, setFrameIdx] = useState(0);
  const frames = artwork.frames && artwork.frames.length > 0 ? artwork.frames : [artwork.dataUrl];

  useEffect(() => {
    if (!artwork.isAnimated || frames.length <= 1) return;
    const ms = Math.round(1000 / (artwork.fps ?? 4));
    const timer = window.setInterval(() => {
      setFrameIdx((i) => (i + 1) % frames.length);
    }, ms);
    return () => window.clearInterval(timer);
  }, [artwork.isAnimated, artwork.fps, frames.length]);

  const motionClass =
    artwork.motionPreset === 'bounce'
      ? 'animate-bounce'
      : artwork.motionPreset === 'float'
        ? 'animate-pulse'
        : '';

  return (
    <img
      src={frames[frameIdx]}
      alt={artwork.title}
      referrerPolicy="no-referrer"
      className={`h-full w-full object-contain ${motionClass}`}
    />
  );
};

export const GalleryView: React.FC<GalleryViewProps> = ({
  artworks,
  onContinueDrawing,
  onAnimateArtwork,
  onDeleteArtwork,
  onGoToLessons,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const formatDate = (ts: number) => {
    try {
      return new Intl.DateTimeFormat('nl-NL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(ts));
    } catch {
      return '';
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            Mijn Tekeningen
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Al jouw opgeslagen kunstwerken en animaties blijven veilig bewaard op dit apparaat.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToLessons}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 whitespace-nowrap shrink-0"
        >
          <PenTool className="h-4 w-4" />
          <span>Nieuwe tekening maken</span>
        </button>
      </div>

      {artworks.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <FolderOpen className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-slate-900">
            Je tekenmap is nog leeg
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            Kies een leuke tekenles of begin op het Vrije Tekenbord en klik op &ldquo;Opslaan&rdquo; om jouw kunstwerk hier te bewaren.
          </p>
          <button
            type="button"
            onClick={onGoToLessons}
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
          >
            <span>Bekijk de tekenlessen</span>
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {artworks.map((art) => (
            <article
              key={art.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="aspect-[600/480] w-full overflow-hidden border-b border-slate-100 bg-white p-3">
                <AnimatedArtworkPreview artwork={art} />
              </div>

              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs text-slate-500">
                  {art.isAnimated
                    ? `Animatie · ${art.frames?.length ?? 1} frames`
                    : 'Tekening'}{' '}
                  · {formatDate(art.createdAt)}
                </p>
                <h2 className="mt-1.5 font-display text-lg font-bold text-slate-900">
                  {art.title}
                </h2>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => onContinueDrawing(art)}
                    className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
                  >
                    <PenTool className="h-3.5 w-3.5" />
                    <span>Verder tekenen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onAnimateArtwork(art)}
                    className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 border border-sky-200 hover:bg-sky-100 whitespace-nowrap"
                  >
                    <Film className="h-3.5 w-3.5" />
                    <span>Animeren</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      downloadDataUrl(
                        art.dataUrl,
                        `${art.title.toLowerCase().replace(/\s+/g, '-')}.png`
                      )
                    }
                    className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    title="Download PNG"
                    aria-label="Download tekening als PNG"
                  >
                    <Download className="h-4 w-4" />
                  </button>

                  {confirmDeleteId === art.id ? (
                    <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5">
                      <span className="text-xs font-semibold text-rose-800">Verwijderen?</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteArtwork(art.id);
                            setConfirmDeleteId(null);
                          }}
                          className="rounded bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                        >
                          Ja
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Nee
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(art.id)}
                      className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white text-rose-600 hover:bg-rose-50"
                      title="Verwijder tekening"
                      aria-label="Verwijder tekening"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
