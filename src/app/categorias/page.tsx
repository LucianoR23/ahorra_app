import { AppShell } from "@/components/app-shell";
import { CategoriesManager } from "@/components/categories-manager";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";

const CATEGORIAS_HELP: InfoHelpContent = {
  titulo: "Categorías",
  acciones: [
    "Creá una categoría con el botón +, o una subcategoría dentro de otra (Servicios > Luz).",
    "Tocá una categoría para cambiarle el nombre, el ícono o dónde va.",
    "Eliminá una categoría que ya no uses desde su hoja de edición.",
  ],
  consideraciones: [
    "Solo el nombre es obligatorio.",
    "Una categoría con subcategorías no puede ir dentro de otra.",
    "Al eliminar una categoría, los gastos que la usaban quedan sin categoría (no se borran).",
    "Las categorías son del hogar activo: las comparten todos sus miembros.",
  ],
  relacionado: [
    { label: "Agregar gasto", href: "/agregar" },
    { label: "Movimientos", href: "/movimientos" },
    { label: "Hogar", href: "/hogar" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <CategoriesManager help={<InfoHelp content={CATEGORIAS_HELP} size="icon" />} />
    </AppShell>
  );
}
