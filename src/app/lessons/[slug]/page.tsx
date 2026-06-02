import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllLessons, getLesson } from "@/lib/lessons";
import { LessonPlayer } from "@/components/lesson-player";

type Params = { slug: string };

// Pre-generate every lesson page at build time (SSG, §2/§4.2).
export async function generateStaticParams(): Promise<Params[]> {
  const lessons = await getAllLessons();
  return lessons.map((l) => ({ slug: l.slug }));
}

// Only the slugs above exist; anything else 404s (§6).
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await getLesson(slug);
  if (!lesson) return {};
  return { title: lesson.title, description: lesson.description };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const lesson = await getLesson(slug);
  if (!lesson) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-6 sm:px-6 sm:pt-10">
      <div className="mb-4">
        <Link
          href="/"
          className="label-mono text-muted transition-colors hover:text-foreground"
        >
          ← LESSONS
        </Link>
      </div>
      <header className="mb-2">
        <p className="label-mono text-muted">{lesson.category}</p>
        <h1 className="mt-1 text-xl font-semibold sm:text-2xl">
          {lesson.title}
        </h1>
        <p className="mt-1 text-sm text-muted">{lesson.description}</p>
      </header>

      <LessonPlayer lesson={lesson} />
    </main>
  );
}
