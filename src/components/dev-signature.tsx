import { cn } from "@/lib/utils";
import { LemyLogo } from "@/components/lemy-logo";

export function DevSignature({ className, size = 10 }: { className?: string; size?: number }) {
  return (
    <div
      className={cn("flex items-center justify-center gap-1 text-muted-foreground/60", className)}
      style={{ fontSize: size }}
    >
      <span>Desarrollado por</span>
      <LemyLogo size={size} asLink />
    </div>
  );
}
