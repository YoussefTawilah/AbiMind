/** Chart-/UI-Farben – Werte spiegeln @theme in index.css wider */
export const SCORE_COLORS = {
  1: '#ef4444',
  2: '#f97316',
  3: '#facc15',
  4: '#a3e635',
  5: '#22c55e',
  neutral: '#4b4d5c',
} as const;

export const SURFACE_BASE = '#0f1014';
export const SURFACE_RAISED = '#18191f';
export const BORDER_SUBTLE = '#2c2d38';
export const TEXT_PRIMARY = '#f0f1f5';
export const TEXT_SECONDARY = '#9b9dad';

/** Kenntnis-Boxen (Donut) → Score-Tokens */
export const KNOWLEDGE_BOX_COLORS = {
  neu: SCORE_COLORS[2],
  aktiv: SCORE_COLORS[3],
  beherrscht: SCORE_COLORS[5],
} as const;

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: SURFACE_RAISED,
  border: `1px solid ${BORDER_SUBTLE}`,
  borderRadius: '8px',
  color: TEXT_PRIMARY,
} as const;

export const CHART_LEGEND_STYLE = {
  color: TEXT_SECONDARY,
  fontSize: '12px',
  paddingTop: '12px',
} as const;
