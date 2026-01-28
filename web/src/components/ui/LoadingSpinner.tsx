/**
 * Loading Spinner Component
 *
 * Animated loading indicator in SpaceX style.
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

export function LoadingSpinner({
  size = 'md',
  color = '#00d4ff',
  text,
}: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizes[size]} relative`}>
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
          style={{
            borderTopColor: color,
            borderRightColor: `${color}50`,
            animationDuration: '1s',
          }}
        />
        {/* Inner ring */}
        <div
          className="absolute inset-1 rounded-full border-2 border-transparent animate-spin"
          style={{
            borderBottomColor: color,
            borderLeftColor: `${color}30`,
            animationDuration: '1.5s',
            animationDirection: 'reverse',
          }}
        />
        {/* Center dot */}
        <div
          className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: color }}
        />
      </div>
      {text && (
        <span className="text-xs text-white/60 font-mono uppercase tracking-wider">
          {text}
        </span>
      )}
    </div>
  );
}
