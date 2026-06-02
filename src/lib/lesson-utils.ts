// Client-safe helpers (no Node APIs) shared across UI and server.

/**
 * Normalize a speaker name for identity comparison only (§4.1).
 * Used to DETECT casing/whitespace variants — never to rewrite stored names.
 */
export function speakerKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Build a cache-busted audio URL (§6). The hash changes only when the
 * line's text/voice changes, so browsers re-fetch exactly the changed files.
 */
export function audioSrc(audioPath: string, audioHash: string): string {
  return `${audioPath}?v=${audioHash}`;
}
