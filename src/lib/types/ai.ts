/**
 * Discriminated union for AI service results.
 * Allows callers to distinguish success from failure structurally
 * instead of inspecting string content.
 */
export type AIResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };
