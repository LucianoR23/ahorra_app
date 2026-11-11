import { AppShell } from "@/components/app-shell";
import { ExpensesList } from "@/components/expenses-list";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";

const MOVIMIENTOS_HELP: InfoHelpContent = {
  titulo: "Movimientos",
  acciones: [
    "Navegá entre meses con las flechas para ver los gastos de cada período.",
    "Buscá un gasto por su descripción con la lupa y combiná los filtros de arriba: tipo (Todos, Fijos o Variables), categoría y medio de pago.",
    "Tocá un gasto para abrir su detalle, donde podés editarlo, eliminarlo y marcar sus cuotas como pagadas.",
    "Cargá un gasto nuevo con el botón + de abajo.",
    "Bajá tus gastos en Excel con el botón de descarga: el mes que estás viendo con sus filtros, o el año entero.",
  ],
  consideraciones: [
    "Las categorías y los medios de pago de los filtros se crean en otras pantallas (Categorías y Tarjetas): si te falta alguno, agregalo ahí primero.",
    "«Fijos» son los gastos generados por un recurrente y «Variables» el resto; los recurrentes se administran en Recurrentes.",
    "Eliminar un gasto desde su detalle no se puede deshacer.",
    "El Excel trae los gastos confirmados (no los borradores de facturas variables). El medio de pago aparece solo en los tuyos: el de otro integrante queda vacío.",
    "Cada gasto muestra su monto original; si fue en otra moneda, al lado ves cuánto es en pesos. Los totales del mes y de cada día van en pesos.",
  ],
  relacionado: [
    { label: "Agregar gasto", href: "/agregar" },
    { label: "Categorías", href: "/categorias" },
    { label: "Recurrentes", href: "/recurrentes" },
    { label: "Tarjetas", href: "/tarjetas" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <ExpensesList help={<InfoHelp content={MOVIMIENTOS_HELP} size="icon" />} />
    </AppShell>
  );
}
