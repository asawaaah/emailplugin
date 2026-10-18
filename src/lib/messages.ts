// Messages échangés entre le popup ou la page d'options et le service worker.
// La connexion Google passe toujours par le service worker : le popup se ferme
// dès que la fenêtre Google prend le focus, ce qui interromprait la connexion.

export type Request =
  | { type: 'getToken'; email: string; interactive?: boolean; forceRefresh?: boolean }
  | { type: 'addAccount' }
  | { type: 'removeAccount'; email: string }
  | { type: 'refresh' }
  | { type: 'testNotification' }
  | { type: 'threadAction'; email: string; threadId: string; action: 'markRead' | 'archive' }
  | { type: 'openThread'; email: string; threadId: string | null }
  | { type: 'dismissToasts'; keys: string[] }
  | { type: 'placeToastWindow'; windowId: number; height: number };

export type ErrorCode = 'auth_required' | 'no_client_id' | 'canceled' | 'mismatch' | 'failed';

export type Response<T = unknown> = { ok: true; data: T } | { ok: false; code: ErrorCode; message: string };

export class RemoteError extends Error {
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
    this.name = 'RemoteError';
  }
}

export async function send<T>(request: Request): Promise<T> {
  const response = (await chrome.runtime.sendMessage(request)) as Response<T> | undefined;
  if (!response) throw new RemoteError('failed', 'no_response');
  if (!response.ok) throw new RemoteError(response.code, response.message);
  return response.data;
}
