// Resolve asset paths respeitando o `base` do Vite (necessário p/ GitHub Pages).
export function asset(p: string): string {
  const clean = p.replace(/^\//, '');
  return `${import.meta.env.BASE_URL}${clean}`;
}
