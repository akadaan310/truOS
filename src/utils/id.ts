/** Local-only unique id — good enough for on-device records, no crypto dependency needed. */
export function generateId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random}`;
}
