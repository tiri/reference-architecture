import { ApiError, type ProblemDetail } from "./problem";

/**
 * Same-origin API client for the module's own BFF.
 *
 * The browser never holds a token — requests ride on the HttpOnly session cookie. That
 * cookie is `SameSite=Lax`, so a cross-site request never carries it and arrives
 * unauthenticated; this is why no CSRF token is needed, and why every state-changing
 * endpoint must stay a non-GET method.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith("/")) {
    throw new Error("apiFetch only accepts same-origin absolute paths, got: " + path);
  }
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json, application/problem+json");
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, { ...init, headers, credentials: "same-origin" });
  if (!response.ok) {
    const contentType = response.headers.get("Content-Type") ?? "";
    const problem = contentType.includes("json")
      ? ((await response.json().catch(() => null)) as ProblemDetail | null)
      : null;
    throw new ApiError(response.status, problem);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
