interface ProgressBarProps {
  learned: number;
  total: number;
  label?: string;
}

export function ProgressBar({ learned, total, label }: ProgressBarProps) {
  const percent = total > 0 ? Math.round((learned / total) * 100) : 0;

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex justify-between text-caption">
          <span className="text-text-secondary">{label}</span>
          <span className="tabular-nums text-text-tertiary">
            {learned} / {total} ({percent}%)
          </span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-overlay">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
