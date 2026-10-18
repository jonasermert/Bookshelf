import type { Book, BookInput, Session } from './types';

export class ApiError extends Error {
  constructor(message: string, public status = 0, public fields: Record<string, string> = {}) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { credentials: 'same-origin', ...init });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Keine Verbindung zum Server. Bitte prüfe, ob das Backend läuft.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const fallback = response.status === 401 ? 'Bitte melde dich erneut an.' :
      response.status === 403 ? 'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuche es erneut.' :
      response.status === 404 ? 'Das Buch wurde nicht gefunden. Bitte lade die Bibliothek neu.' :
      'Die Anfrage ist fehlgeschlagen. Bitte versuche es erneut.';
    throw new ApiError(body.message || fallback, response.status, body.fields || {});
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

async function mutate<T>(path: string, method: string, body?: string, form = false) {
  // Nach Anmeldung und Abmeldung kann Spring den CSRF-Token wechseln.
  const csrf = await request<{ token: string; headerName: string }>('/api/csrf');
  return request<T>(path, { method, body, headers: {
    [csrf.headerName]: csrf.token,
    'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json',
  } });
}

export const api = {
  session: (signal?: AbortSignal) => request<Session>('/api/session', { signal }),
  login: (username: string, password: string) => mutate<void>('/api/login', 'POST', new URLSearchParams({ username, password }).toString(), true),
  logout: () => mutate<void>('/api/logout', 'POST'),
  list: (signal?: AbortSignal) => request<Book[]>('/book', { signal }),
  create: (book: BookInput) => mutate<Book>('/book', 'POST', JSON.stringify(book)),
  update: (isbn: string, book: BookInput) => mutate<Book>('/book/' + encodeURIComponent(isbn), 'PUT', JSON.stringify(book)),
  remove: (isbn: string) => mutate<void>('/book/' + encodeURIComponent(isbn), 'DELETE'),
};
