import { AppShell } from "@/components/app-shell";
import { InsightsInbox } from "@/components/insights-inbox";

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Notificaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resúmenes, alertas e insights de tu hogar.
        </p>
      </div>
      <InsightsInbox />
    </AppShell>
  );
}
