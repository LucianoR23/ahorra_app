import { AppShell } from "@/components/app-shell";
import { ExpensesList } from "@/components/expenses-list";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";

const MOVIMIENTOS_HELP: InfoHelpContent = {
  titulo: "Movimientos",
  acciones: [
    "Navegá entre meses con las flechas para ver los gastos de cada período.",
    "Buscá un gasto por su descripción y combiná filtros por categoría, medio de pago o tipo (Todos, Fijos o Variables).",
    "Tocá un gasto para abrir su detalle, donde podés editarlo, eliminarlo y marcar sus cuotas como pagadas.",
    "Cargá un gasto nuevo desde «Agregar gasto».",
  ],
  consideraciones: [
    "Las categorías y los medios de pago de los filtros se crean en otras pantallas (Categorías y Ajustes): si te falta alguno, agregalo ahí primero.",
    "«Fijos» son los gastos generados por un recurrente y «Variables» el resto; los recurrentes se administran en Recurrentes.",
    "Eliminar un gasto desde su detalle no se puede deshacer.",
    "Los importes se muestran en tu moneda base; si el gasto fue en otra moneda, debajo ves el monto original.",
  ],
  relacionado: [
    { label: "Agregar gasto", href: "/agregar" },
    { label: "Categorías", href: "/categorias" },
    { label: "Recurrentes", href: "/recurrentes" },
    { label: "Ajustes (medios de pago)", href: "/ajustes" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight">Movimientos</h1>
            <InfoHelp content={MOVIMIENTOS_HELP} size="icon" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Filtrá por mes, categoría, medio de pago o tipo.</p>
        </div>
      </div>
      <ExpensesList />
    </AppShell>
  );
}
