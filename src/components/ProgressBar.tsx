import { useEffect, useState } from 'react';
import { getProgressColorClasses } from '../utils/helpers';

interface ProgressBarProps {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

export function ProgressBar({
  progress,
  size = 'md',
  showLabel = true,
  animated = true,
  className = '',
}: ProgressBarProps) {
  const [displayProgress, setDisplayProgress] = useState(animated ? 0 : progress);
  const colors = getProgressColorClasses(progress);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayProgress(progress);
    }
  }, [progress, animated]);

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center gap-3">
        <div
          className={`flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${heightClasses[size]}`}
        >
          <div
            className={`${colors.bar} ${heightClasses[size]} rounded-full progress-bar`}
            style={{ width: `${Math.min(displayProgress, 100)}%` }}
          />
        </div>
        {showLabel && (
          <span className={`text-sm font-semibold ${colors.text} min-w-[3rem] text-right`}>
            {progress}%
          </span>
        )}
      </div>
    </div>
  );
}
