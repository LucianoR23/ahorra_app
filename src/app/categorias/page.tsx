import { AppShell } from "@/components/app-shell";
import { CategoriesManager } from "@/components/categories-manager";

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
        <p className="mt-1 text-sm text-muted-foreground">Organizá tus gastos por categorías del hogar.</p>
      </div>
      <CategoriesManager />
    </AppShell>
  );
}
