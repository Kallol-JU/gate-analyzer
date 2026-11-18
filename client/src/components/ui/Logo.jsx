import { cn } from '../../utils/cn.js';
import { APP_NAME } from '../../utils/constants.js';

function PrepGateMark({ className = 'size-8' }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="PrepGate mark"
      className={cn('shrink-0', className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="prepgate-blue" x1="8" y1="5" x2="40" y2="43" gradientUnits="userSpaceOnUse">
          <stop stopColor="#48A7FF" />
          <stop offset="1" stopColor="#2452D6" />
        </linearGradient>
      </defs>
      <path d="M10 25V20C10 11.72 16.72 5 25 5C33.28 5 40 11.72 40 20V25" stroke="url(#prepgate-blue)" strokeWidth="6" strokeLinecap="round" />
      <path d="M22.1 15.2L24.9 19.2L27.8 15.2L26.8 21.1L24.9 23.1L23 21.1L22.1 15.2Z" fill="#2452D6" />
      <path d="M5.5 29.2C11.9 26.1 18.2 26.5 24 31.1C29.8 26.5 36.1 26.1 42.5 29.2L39.7 36.8C33.8 34.3 28.5 34.9 24 39C19.5 34.9 14.2 34.3 8.3 36.8L5.5 29.2Z" fill="currentColor" />
      <path d="M7.1 38.5C13.4 36.1 18.9 37.1 24 41.4C29.1 37.1 34.6 36.1 40.9 38.5" stroke="url(#prepgate-blue)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M24 31.1V40.8" stroke="#2452D6" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ className, showText = true, markClassName = 'size-8' }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-lg font-bold tracking-tight', className)}>
      <PrepGateMark className={markClassName} />
      {showText && (
        <span className="inline-flex items-baseline">
          <span>Prep</span><span className="text-primary-600">Gate</span>
        </span>
      )}
    </span>
  );
}
