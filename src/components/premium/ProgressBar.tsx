import { cn } from "@reconquista/ui/lib/utils";

interface ProgressBarProps {
  value: number;
  accent?: "red" | "gold";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const ProgressBar = ({
  value,
  accent = "gold",
  showLabel = false,
  size = "md",
  className,
}: ProgressBarProps) => {
  const clamped = Math.max(0, Math.min(100, value));
  const height = size === "sm" ? "h-1" : size === "lg" ? "h-3" : "h-1.5";
  const fillColor = accent === "red" ? "bg-primary" : "bg-accent";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("flex-1 overflow-hidden rounded-full bg-muted", height)}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", fillColor)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
};

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  accent?: "red" | "gold";
  className?: string;
}

export const CircularProgress = ({
  value,
  size = 40,
  strokeWidth = 3,
  accent = "gold",
  className,
}: CircularProgressProps) => {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clamped / 100) * circumference;
  const stroke = accent === "red" ? "stroke-primary" : "stroke-accent";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("fill-none transition-all duration-500", stroke)}
        />
      </svg>
      <span className="absolute font-mono text-[10px] font-bold text-foreground tabular-nums">
        {Math.round(clamped)}
      </span>
    </div>
  );
};
