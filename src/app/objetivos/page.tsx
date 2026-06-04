import { AppShell } from "@/components/app-shell";
import { GoalsManager } from "@/components/goals-manager";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";

const OBJETIVOS_HELP: InfoHelpContent = {
  titulo: "Objetivos",
  acciones: [
    "Creá un objetivo: límite total, límite por categoría o meta de ahorro.",
    "Elegí alcance (todo el hogar o un miembro), monto, moneda y período (mensual o anual).",
    "Seguí el progreso en vivo con su estado: en camino, atención, excedido o logrado.",
    "Abrí «Detalle» para ver el progreso a una fecha puntual.",
    "Pausá o activá, editá y eliminá cada objetivo.",
  ],
  consideraciones: [
    "El progreso se calcula solo a partir de tus gastos (e ingresos, en las metas de ahorro): no se actualiza a mano.",
    "Un límite por categoría requiere elegir una categoría; si falta, creala antes en Categorías.",
    "Al editar no podés cambiar el tipo ni el alcance del objetivo; sí el monto, la moneda, la categoría y el período.",
    "Pausar un objetivo frena sus alertas y lo saca del seguimiento activo, pero no lo borra.",
  ],
  relacionado: [
    { label: "Movimientos", href: "/movimientos" },
    { label: "Ingresos", href: "/ingresos" },
    { label: "Categorías", href: "/categorias" },
    { label: "Ajustes (miembros)", href: "/ajustes" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Objetivos</h1>
          <InfoHelp content={OBJETIVOS_HELP} size="icon" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Límites de gasto y metas de ahorro con progreso en vivo.
        </p>
      </div>
      <GoalsManager />
    </AppShell>
  );
}
