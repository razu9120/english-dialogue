import { getAllLessons, getCategories } from "@/lib/lessons";
import { LessonBrowser } from "@/components/lesson-browser";

// Lesson list is statically generated at build time (§4.2).
export default async function HomePage() {
  const [allLessons, categories] = await Promise.all([
    getAllLessons(),
    getCategories(),
  ]);

  // Pass only what the cards need (keep the client payload small).
  const lessons = allLessons.map((l) => ({
    slug: l.slug,
    title: l.title,
    description: l.description,
    category: l.category,
    turnCount: l.turns.length,
  }));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 sm:mb-12">
        <p className="label-mono text-muted">English Dialogue</p>
        <h1 className="mt-1 font-mono text-2xl font-bold tracking-tight sm:text-3xl">
          LESSONS
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted">
          リスニング・シャドーイング用の英会話スクリプト。
        </p>
      </header>

      {lessons.length === 0 ? (
        <p className="text-sm text-muted">
          レッスンがありません。<code>content/input/</code> に JSON を追加し、
          <code>npm run generate</code> を実行してください。
        </p>
      ) : (
        <LessonBrowser lessons={lessons} categories={categories} />
      )}
    </main>
  );
}
