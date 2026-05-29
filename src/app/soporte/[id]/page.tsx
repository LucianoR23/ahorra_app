import { AppShell } from "@/components/app-shell";
import { SupportDetail } from "@/components/soporte/support-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      <SupportDetail id={id} />
    </AppShell>
  );
}
