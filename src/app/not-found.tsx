import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="label-mono text-accent">404</p>
      <h1 className="mt-2 text-2xl font-semibold">ページが見つかりません</h1>
      <p className="mt-2 text-sm text-muted">
        指定されたレッスンは存在しません。
      </p>
      <Link
        href="/"
        className="mt-6 label-mono text-muted transition-colors hover:text-foreground"
      >
        ← LESSONS
      </Link>
    </main>
  );
}
