/** App-level upload cap. Stays under the platform request-body limit (4.5 MB). */
export const MAX_BODY_BYTES = 4 * 1024 * 1024;

export interface ApiError {
  code: string;
  message: string;
  details: Record<string, unknown> | null;
}

export function fail(status: number, code: string, message: string, details: Record<string, unknown> | null = null, headers?: Record<string, string>) {
  const body = { error: { code, message, details } satisfies ApiError };
  return { status, body, headers };
}

export function tooLarge() {
  return fail(413, 'PAYLOAD_TOO_LARGE', 'Ballot file too large (max 4 MB)', { maxBytes: MAX_BODY_BYTES });
}
