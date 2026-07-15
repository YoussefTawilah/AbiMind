function CalendarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  wrapperClassName?: string;
}

/** Datumsfeld mit sichtbarem hellem Kalender-Icon (Dark Theme). */
export function DateInput({ className = '', wrapperClassName = '', ...props }: DateInputProps) {
  return (
    <div className={`date-input-wrap relative ${wrapperClassName}`.trim()}>
      <input
        type="date"
        className={`input-field input-date ${className}`.trim()}
        {...props}
      />
      <span
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-primary"
        aria-hidden
      >
        <CalendarIcon />
      </span>
    </div>
  );
}
