export type LessonCategory = 'Dieren' | 'Ruimte' | 'Natuur' | 'Fantasie';

export type DifficultyLevel = 'Heel Makkelijk' | 'Makkelijk' | 'Gemiddeld';

export type AgeGroup = '4–6 jaar' | '6–9 jaar' | 'Alle leeftijden';

export interface StrokePath {
  d: string;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  isDetail?: boolean;
}

export interface DrawingStep {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  mascotTip: string;
  suggestedColor: string;
  strokes: StrokePath[];
}

export interface PreviewFill {
  d: string;
  fill: string;
}

export interface DrawingLesson {
  id: string;
  title: string;
  characterName: string;
  characterIntro: string;
  category: LessonCategory;
  difficulty: DifficultyLevel;
  ageGroup: AgeGroup;
  accentColor: string;
  steps: DrawingStep[];
  previewFills: PreviewFill[];
}

export type DrawTool = 'marker' | 'pencil' | 'crayon' | 'fill' | 'eraser';

export type GuideVisibility = 'off' | 'light' | 'clear';

export type AnimationSpeed = 'slow' | 'normal' | 'fast';

export type AppView = 'lessons' | 'studio' | 'animate' | 'gallery';

export type MotionPreset = 'none' | 'bounce' | 'wiggle' | 'float';

export interface SavedArtwork {
  id: string;
  title: string;
  lessonId?: string;
  dataUrl: string;
  frames?: string[];
  createdAt: number;
  isAnimated: boolean;
  fps?: number;
  motionPreset?: MotionPreset;
}
