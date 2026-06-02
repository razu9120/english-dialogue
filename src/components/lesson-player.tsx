"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import type { Lesson } from "@/types/lesson";
import { audioSrc } from "@/lib/lesson-utils";
import { cn } from "@/lib/utils";

type DisplayMode = "en" | "both";
const SPEEDS = [0.5, 0.75, 1, 1.25] as const;
const MODE_KEY = "display-mode";
const SPEED_KEY = "playback-speed";

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const turns = lesson.turns;

  // --- persisted user settings (§7.7) ---
  const [mode, setMode] = useState<DisplayMode>("en"); // default: English only (§4.2)
  const [speed, setSpeed] = useState<number>(1);

  // --- playback state ---
  const [current, setCurrent] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [errored, setErrored] = useState<Set<number>>(new Set());

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Restore persisted settings after mount. setState here is intentional —
  // localStorage is unavailable during SSR, so we hydrate with defaults then
  // sync to the saved values (avoids a hydration mismatch).
  useEffect(() => {
    const m = localStorage.getItem(MODE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (m === "en" || m === "both") setMode(m);
    const s = Number(localStorage.getItem(SPEED_KEY));
    if (SPEEDS.includes(s as (typeof SPEEDS)[number])) setSpeed(s);
  }, []);

  const srcFor = useCallback(
    (i: number) => audioSrc(turns[i].audio_path, turns[i].audio_hash),
    [turns],
  );

  // Warm the next file so line transitions have no silent gap (§7.7).
  const preloadNext = useCallback(
    (i: number) => {
      if (i + 1 < turns.length && preloadRef.current) {
        preloadRef.current.src = srcFor(i + 1);
      }
    },
    [turns.length, srcFor],
  );

  // Play a given line from its start; tapping the same line re-heads it (§4.2).
  const playIndex = useCallback(
    (i: number) => {
      const audio = audioRef.current;
      if (!audio || i < 0 || i >= turns.length) return;
      setCurrent(i);
      setBuffering(true);
      audio.src = srcFor(i);
      audio.playbackRate = speed;
      audio.currentTime = 0;
      void audio.play().then(
        () => setIsPlaying(true),
        () => {
          setIsPlaying(false); // autoplay blocked until a user gesture
          setBuffering(false);
        },
      );
      preloadNext(i);
    },
    [turns.length, srcFor, preloadNext, speed],
  );

  // Play button: resume, or start the whole lesson from the top (§4.2).
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else if (current === null) {
      playIndex(0);
    } else {
      audio.playbackRate = speed;
      void audio.play().then(
        () => setIsPlaying(true),
        () => setIsPlaying(false),
      );
    }
  }, [isPlaying, current, playIndex, speed]);

  // Auto-chain to the next line when one ends (§4.2).
  const handleEnded = useCallback(() => {
    setCurrent((c) => {
      const next = (c ?? -1) + 1;
      if (next < turns.length) {
        // defer to escape the state updater
        queueMicrotask(() => playIndex(next));
        return c;
      }
      setIsPlaying(false);
      return c;
    });
  }, [turns.length, playIndex]);

  // Missing/broken audio: flag the line and skip to the next (§6).
  const handleError = useCallback(() => {
    setCurrent((c) => {
      if (c === null) return c;
      setErrored((prev) => new Set(prev).add(c));
      const next = c + 1;
      if (next < turns.length) {
        queueMicrotask(() => playIndex(next));
      } else {
        setIsPlaying(false);
      }
      return c;
    });
  }, [turns.length, playIndex]);

  // Speed: applies immediately to in-flight playback, never stops it (§4.2).
  const changeSpeed = useCallback((s: number) => {
    setSpeed(s);
    localStorage.setItem(SPEED_KEY, String(s));
    if (audioRef.current) audioRef.current.playbackRate = s;
  }, []);

  // Display mode: affects text only — never playback/highlight (§4.2, §7.7).
  const toggleMode = useCallback(() => {
    setMode((m) => {
      const next = m === "en" ? "both" : "en";
      localStorage.setItem(MODE_KEY, next);
      return next;
    });
  }, []);

  // Keep the active line in view as playback advances (§4.2).
  useEffect(() => {
    if (current === null) return;
    rowRefs.current[current]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [current]);

  // Keyboard controls (§7.7): Space play/pause, → next, ← re-head current.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (current === null) {
          playIndex(0);
        } else if (current + 1 < turns.length) {
          playIndex(current + 1);
        } else {
          // already on the final turn → stop (§7.7)
          audioRef.current?.pause();
          setIsPlaying(false);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        playIndex(current ?? 0);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, playIndex, current, turns.length]);

  // Fixed speaker sides: 1st speaker → left, 2nd → right; monologue → all left.
  const firstSpeaker = turns[0]?.speaker;
  const secondSpeaker = turns.find((t) => t.speaker !== firstSpeaker)?.speaker;
  const sideOf = (speaker: string): "left" | "right" =>
    secondSpeaker && speaker === secondSpeaker ? "right" : "left";

  return (
    <div className="flex flex-1 flex-col">
      {/* Hidden audio elements: primary + preload warmer */}
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        onError={handleError}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onPause={() => setBuffering(false)}
        preload="auto"
        className="hidden"
      />
      <audio ref={preloadRef} preload="auto" className="hidden" />

      {/* Conversation */}
      <ul className="flex flex-col gap-2 pb-40 pt-4">
        {turns.map((turn, i) => {
          const side = sideOf(turn.speaker);
          const active = i === current;
          const isErr = errored.has(i);
          return (
            <li
              key={turn.turn_id}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              className={cn(
                "flex",
                side === "right" ? "justify-end" : "justify-start",
              )}
            >
              <button
                type="button"
                onClick={() => playIndex(i)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "w-[85%] rounded border px-4 py-3 text-left transition-colors sm:w-[80%]",
                  active
                    ? "border-accent bg-accent/5"
                    : "border-border bg-surface hover:bg-surface-2",
                )}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={cn(
                      "font-mono text-[0.6875rem] tracking-wider",
                      active ? "text-accent" : "text-muted",
                      isErr && "line-through",
                    )}
                  >
                    {String(turn.turn_id).padStart(2, "0")}
                  </span>
                  <span className="label-mono text-muted">{turn.speaker}</span>
                  {isErr && (
                    <span className="label-mono text-disabled">NO AUDIO</span>
                  )}
                </div>
                <p
                  className={cn(
                    "text-base leading-relaxed sm:text-lg",
                    active && "text-accent",
                  )}
                >
                  {turn.text}
                </p>
                {/* Translation collapses entirely in English-only mode (§7.7) */}
                {mode === "both" && (
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {turn.translation}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Control bar — bottom for one-handed mobile use (§7.6) */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur">
        <div
          className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "一時停止" : "再生"}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-accent text-accent-foreground transition-opacity hover:opacity-90"
          >
            {buffering ? (
              <Loader2 className="size-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="size-5" fill="currentColor" />
            ) : (
              <Play className="size-5" fill="currentColor" />
            )}
          </button>

          {/* Position indicator (§7.4) */}
          <span className="font-mono text-xs tabular-nums text-muted">
            {String(current === null ? 0 : current + 1).padStart(2, "0")}
            <span className="text-disabled"> / </span>
            {String(turns.length).padStart(2, "0")}
          </span>

          <div className="ml-auto flex items-center gap-3">
            {/* Speed selector */}
            <div
              className="flex overflow-hidden rounded border border-border"
              role="group"
              aria-label="再生速度"
            >
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeSpeed(s)}
                  aria-pressed={speed === s}
                  className={cn(
                    "h-9 px-2 font-mono text-[0.6875rem] tracking-wide transition-colors",
                    speed === s
                      ? "bg-foreground text-background"
                      : "bg-surface text-muted hover:bg-surface-2",
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>

            {/* Display mode toggle (§7.4) */}
            <button
              type="button"
              onClick={toggleMode}
              aria-pressed={mode === "both"}
              className={cn(
                "h-9 rounded border px-3 font-mono text-[0.6875rem] uppercase tracking-wider transition-colors",
                mode === "both"
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-surface text-foreground hover:bg-surface-2",
              )}
            >
              {mode === "both" ? "EN+JA" : "EN"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
