import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Lesson } from "@/types/lesson";

const LESSONS_DIR = path.join(process.cwd(), "content", "lessons");

/**
 * Read all generated lesson metadata at build time, sorted by slug ascending
 * so input filenames (e.g. 01-..., 02-...) control display order (§4.2).
 */
export async function getAllLessons(): Promise<Lesson[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(LESSONS_DIR);
  } catch {
    return [];
  }

  const slugs = entries
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort((a, b) => a.localeCompare(b));

  const lessons = await Promise.all(slugs.map((slug) => readLesson(slug)));
  return lessons.filter((l): l is Lesson => l !== null);
}

/** Read a single lesson by slug, or null if missing/invalid. */
export async function getLesson(slug: string): Promise<Lesson | null> {
  return readLesson(slug);
}

/** Collect the unique category list for the filter UI (§4.2). */
export async function getCategories(): Promise<string[]> {
  const lessons = await getAllLessons();
  return [...new Set(lessons.map((l) => l.category))].sort((a, b) =>
    a.localeCompare(b),
  );
}

async function readLesson(slug: string): Promise<Lesson | null> {
  try {
    const raw = await fs.readFile(
      path.join(LESSONS_DIR, `${slug}.json`),
      "utf8",
    );
    return JSON.parse(raw) as Lesson;
  } catch {
    return null;
  }
}
