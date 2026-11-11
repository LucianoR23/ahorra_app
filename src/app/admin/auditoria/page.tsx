import { AdminAudit } from "@/components/admin/admin-audit";
import { PageHeader } from "@/components/ui/page-header";

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader title="Auditoría" description="Eventos de seguridad de todas las cuentas y lo que hizo cada superadmin." className="mb-0" />
      <AdminAudit />
    </div>
  );
}
