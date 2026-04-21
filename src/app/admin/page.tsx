import { AppShell } from "@/components/app-shell";
import { AdminPanel } from "@/components/admin-panel";

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Herramientas exclusivas para superadmin.
        </p>
      </div>
      <AdminPanel />
    </AppShell>
  );
}
