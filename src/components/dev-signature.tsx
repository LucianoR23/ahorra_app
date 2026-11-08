import { cn } from "@/lib/utils";
import { LemyLogo } from "@/components/lemy-logo";

export function DevSignature({ className, size = 12 }: { className?: string; size?: number }) {
  return (
    <div
      className={cn("flex items-center justify-center gap-1 whitespace-nowrap text-ink-muted", className)}
      style={{ fontSize: size }}
    >
      <span>Desarrollado por</span>
      <LemyLogo size={size} asLink />
    </div>
  );
}
