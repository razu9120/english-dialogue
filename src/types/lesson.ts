// Shared data model for lessons (REQUIREMENTS §3).

/** A single line of dialogue as authored in content/input/<slug>.json. */
export interface InputTurn {
  turn_id: number;
  speaker: string;
  voice_setting: string;
  text: string;
  translation: string;
}

/** Raw input lesson shape (content/input/<slug>.json). */
export interface InputLesson {
  title: string;
  description: string;
  category: string;
  turns: InputTurn[];
}

/** A turn after audio generation, persisted in content/lessons/<slug>.json. */
export interface GeneratedTurn extends InputTurn {
  /** Project-relative audio path, e.g. "/audio/at-the-cafe/1.mp3". */
  audio_path: string;
  /** Hash of text + voice_setting, used for diff regeneration (§4.1). */
  audio_hash: string;
}

/** Generated lesson metadata (content/lessons/<slug>.json). */
export interface Lesson {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  turns: GeneratedTurn[];
}
