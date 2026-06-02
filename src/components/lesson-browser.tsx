"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface LessonSummary {
  slug: string;
  title: string;
  description: string;
  category: string;
  turnCount: number;
}

const STORAGE_KEY = "category-filter";
const ALL = "__all__";

export function LessonBrowser({
  lessons,
  categories,
}: {
  lessons: LessonSummary[];
  categories: string[];
}) {
  // Default "all"; restore the saved category after mount to avoid an SSR/CSR
  // hydration mismatch (§4.2, §7.7).
  const [selected, setSelected] = useState<string>(ALL);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // Intentional: restore the saved filter after mount (localStorage is
    // unavailable during SSR), hydrating with the "all" default first.
    if (saved && (saved === ALL || categories.includes(saved))) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(saved);
    }
  }, [categories]);

  function choose(category: string) {
    setSelected(category);
    localStorage.setItem(STORAGE_KEY, category);
  }

  // lessons arrive pre-sorted by slug; filtering preserves that order (§4.2).
  const visible = useMemo(
    () =>
      selected === ALL
        ? lessons
        : lessons.filter((l) => l.category === selected),
    [lessons, selected],
  );

  return (
    <div>
      <div
        role="tablist"
        aria-label="カテゴリ"
        className="mb-6 flex flex-wrap gap-2"
      >
        <Chip active={selected === ALL} onClick={() => choose(ALL)}>
          ALL
        </Chip>
        {categories.map((cat) => (
          <Chip
            key={cat}
            active={selected === cat}
            onClick={() => choose(cat)}
          >
            {cat}
          </Chip>
        ))}
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((lesson) => (
          <li key={lesson.slug}>
            <Link
              href={`/lessons/${lesson.slug}`}
              className="group flex h-full flex-col rounded border border-border bg-surface p-4 transition-colors hover:border-border-strong"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="label-mono text-muted">{lesson.category}</span>
                <span className="label-mono text-muted">
                  {String(lesson.turnCount).padStart(2, "0")} LINES
                </span>
              </div>
              <h2 className="text-lg font-semibold leading-snug">
                {lesson.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-sm text-muted">
                {lesson.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {visible.length === 0 && (
        <p className="text-sm text-muted">該当するレッスンがありません。</p>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "h-9 rounded border px-3 font-mono text-xs uppercase tracking-wider transition-colors",
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-surface text-foreground hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}
