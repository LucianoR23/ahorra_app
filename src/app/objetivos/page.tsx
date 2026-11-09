import { AppShell } from "@/components/app-shell";
import { GoalsManager } from "@/components/goals-manager";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";

const OBJETIVOS_HELP: InfoHelpContent = {
  titulo: "Presupuestos y objetivos",
  acciones: [
    "Creá un objetivo: límite total, límite por categoría o meta de ahorro.",
    "Elegí el monto, la moneda y el período (mensual o semanal). En un hogar, también si es de todos o de una persona.",
    "Seguí el avance con su estado: en camino, atención o excedido.",
    "Tocá un objetivo para editarlo, ver cómo iba a una fecha, pausarlo o eliminarlo.",
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
    { label: "Hogar y miembros", href: "/hogar" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <GoalsManager help={<InfoHelp content={OBJETIVOS_HELP} size="icon" />} />
    </AppShell>
  );
}
