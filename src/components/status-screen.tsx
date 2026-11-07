import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  /** Buttons or links, stacked full width. */
  children?: ReactNode;
};

/**
 * Full-page message for states outside the app shell: errors, not found,
 * offline (plan 0.13). Same layout as the auth and verify-email screens.
 */
export function StatusScreen({ icon, title, description, children }: Props) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center">
        <BrandLogo variant="wordmark" size={40} />
      </div>
      <div className="w-full max-w-sm">
        <Card className="p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
              {icon}
            </div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children ? <div className="mt-6 flex flex-col gap-2">{children}</div> : null}
        </Card>
      </div>
    </main>
  );
}
