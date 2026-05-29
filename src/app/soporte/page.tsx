import { AppShell } from "@/components/app-shell";
import { SupportList } from "@/components/soporte/support-list";

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Soporte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reportá errores o sugerí mejoras. Seguí el estado de tus reportes acá.
        </p>
      </div>
      <SupportList />
    </AppShell>
  );
}
