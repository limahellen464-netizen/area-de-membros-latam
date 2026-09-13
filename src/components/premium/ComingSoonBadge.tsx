import { Badge } from "@/components/ui/badge";
import { Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComingSoonBadgeProps {
  label?: string;
  variant?: "default" | "compact";
  className?: string;
}

export const ComingSoonBadge = ({
  label = "En preparación",
  variant = "default",
  className,
}: ComingSoonBadgeProps) => {
  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent",
          className,
        )}
      >
        <Clock3 className="h-2.5 w-2.5" />
        {label}
      </span>
    );
  }

  return (
    <Badge
      className={cn(
        "border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20",
        className,
      )}
      variant="outline"
    >
      <Clock3 className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
};
