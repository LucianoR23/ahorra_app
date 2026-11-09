import { AppShell } from "@/components/app-shell";
import { AdminPanel } from "@/components/admin-panel";
import { PageHeader } from "@/components/ui/page-header";

export default function Page() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-4">
        <PageHeader
          title="Superadmin"
          description="Herramientas para administrar la app."
          back={{ href: "/mas", label: "Volver a Más" }}
          className="mb-0"
        />
        <AdminPanel />
      </div>
    </AppShell>
  );
}
