import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SupportForm } from "@/components/soporte/support-form";

export default function Page() {
  return (
    <AppShell>
      <Link
        href="/soporte"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Mis reportes
      </Link>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Nuevo reporte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contanos qué pasó. Adjuntá capturas o un video si ayuda.
        </p>
      </div>
      <SupportForm />
    </AppShell>
  );
}
