/** The brand mark used in the header/logo slots -- same football motif as
 * app/icon.svg (the favicon), sized to sit inside an existing colored/rounded
 * container rather than drawing its own background. */
export function StrataMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="strata-mark-g" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22c55e" />
          <stop offset="1" stopColor="#0ea5b9" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="12.5" fill="url(#strata-mark-g)" />
      <path d="M16 9.5 L21.3 13.4 L19.3 19.6 L12.7 19.6 L10.7 13.4 Z" fill="currentColor" className="text-background" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-background">
        <path d="M16 3.5 L16 9.5" />
        <path d="M4.8 11.9 L10.7 13.4" />
        <path d="M8.2 26 L12.7 19.6" />
        <path d="M23.8 26 L19.3 19.6" />
        <path d="M27.2 11.9 L21.3 13.4" />
      </g>
    </svg>
  );
}
