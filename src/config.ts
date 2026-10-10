// URL base do servidor multiplayer (Render).
// Configure via variável de ambiente VITE_SERVER_URL no build.
// Ex.: VITE_SERVER_URL=https://poketype-server.onrender.com
// Vazio = mesmo host do site (comportamento antigo, dev local).

export const SERVER_URL: string = (
  (import.meta.env.VITE_SERVER_URL as string | undefined) || ''
)
  .trim()
  .replace(/\/+$/, '');

export function getWebSocketUrl(): string {
  if (SERVER_URL) {
    const wsBase = SERVER_URL.replace(/^http/, 'ws');
    return `${wsBase}/ws`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}
