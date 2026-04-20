import { AppShell } from "@/components/app-shell";
import { IncomeDetailView } from "@/components/income-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      <IncomeDetailView id={id} />
    </AppShell>
  );
}
