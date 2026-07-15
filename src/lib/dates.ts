/** Formatiert ISO-Datum (YYYY-MM-DD) für die UI auf Deutsch */
export function formatDateDe(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Kurzformat: 14.07.2026 */
export function formatDateDeShort(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('de-DE');
}
