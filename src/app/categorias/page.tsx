import { AppShell } from "@/components/app-shell";
import { CategoriesManager } from "@/components/categories-manager";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";

const CATEGORIAS_HELP: InfoHelpContent = {
  titulo: "Categorías",
  acciones: [
    "Creá una categoría con nombre, ícono (texto o emoji) y color.",
    "Editá el nombre, el ícono o el color de una categoría existente.",
    "Eliminá una categoría que ya no uses.",
  ],
  consideraciones: [
    "Solo el nombre es obligatorio; el ícono y el color son opcionales.",
    "Al eliminar una categoría, los gastos que la usaban quedan sin categoría (no se borran).",
    "Las categorías son del hogar activo: las comparten todos sus miembros.",
  ],
  relacionado: [
    { label: "Agregar gasto", href: "/agregar" },
    { label: "Movimientos", href: "/movimientos" },
    { label: "Ajustes (hogar)", href: "/ajustes" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
          <InfoHelp content={CATEGORIAS_HELP} size="icon" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Organizá tus gastos por categorías del hogar.</p>
      </div>
      <CategoriesManager />
    </AppShell>
  );
}
