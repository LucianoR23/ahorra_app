import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { DevSignature } from "@/components/dev-signature";
import { ResultCard } from "@/components/ui/result-card";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * Frame of the screens outside the app (login, register, verify, invite):
 * the wordmark on top, one narrow column, the signature at the bottom.
 */
export function AuthShell({ home = "/login", children }: { home?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center bg-background px-4 py-10">
      <Link href={home} aria-label={`${brand.name}, inicio`} className="vt-brand-hero mb-8 flex items-center">
        <BrandLogo variant="wordmark" size={40} priority />
      </Link>
      <main className="w-full max-w-sm sm:max-w-md">{children}</main>
      <DevSignature className="mt-auto pt-10" size={14} />
    </div>
  );
}

/**
 * The panel that holds an auth screen: flat on the phone (like Onboarding),
 * a card from `sm` up.
 */
export function AuthPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      data-slot="auth-panel"
      className={cn(
        "flex flex-col gap-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300",
        "sm:rounded-2xl sm:bg-card sm:p-8 sm:shadow-card sm:dark:ring-1 sm:dark:ring-border",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Title and lead of a form screen. */
export function AuthHeading({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-title text-ink">{title}</h1>
      {description ? <p className="text-body text-ink-muted">{description}</p> : null}
    </div>
  );
}

/** An outcome screen (link sent, invalid link): the result card in the panel. */
export function AuthResult(props: React.ComponentProps<typeof ResultCard>) {
  return (
    <AuthPanel>
      <ResultCard headingLevel="h1" {...props} />
    </AuthPanel>
  );
}

/** The "o" between the form and the Google button. */
export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 text-caption text-ink-muted" aria-hidden>
      <span className="h-px flex-1 bg-border" />
      o
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** A plain text link under a form ("¿No tenés cuenta? Crear cuenta"). */
export function AuthFootnote({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-caption text-ink-muted">{children}</p>;
}

export const authLink = "font-semibold text-ink underline-offset-4 hover:underline";

/** Error under a field. */
export function FieldError({ id, children }: { id?: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="text-caption text-negative">
      {children}
    </p>
  );
}
