import { AppShell } from "@/components/app-shell";
import { ExpenseDetailView } from "@/components/expense-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      <ExpenseDetailView id={id} />
    </AppShell>
  );
}
