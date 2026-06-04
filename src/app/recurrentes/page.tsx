import { AppShell } from "@/components/app-shell";
import { RecurringManager } from "@/components/recurring-manager";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";

const RECURRENTES_HELP: InfoHelpContent = {
  titulo: "Recurrentes",
  acciones: [
    "Alterná entre «Gastos fijos» e «Ingresos fijos» con las pestañas.",
    "Creá un gasto o ingreso fijo con su frecuencia (semanal, mensual o anual) y fecha de inicio.",
    "Marcá un gasto como «Importe variable» (luz, expensas, wifi): el monto es un estimado y cada mes confirmás la factura real.",
    "Editá, pausá o activá, y eliminá cada serie; en los gastos fijos podés ver su histórico.",
  ],
  consideraciones: [
    "Las series se materializan solas cada mes a las 00:30: no tenés que cargarlas a mano.",
    "La fecha de inicio no se puede cambiar después de crear la serie, y al crear solo podés arrancar dentro del mes en curso hacia adelante.",
    "En importe variable las cuotas quedan fijadas en 1 (no se puede repartir un monto que todavía no se conoce).",
    "Las cuotas por cargo solo están disponibles con tarjeta de crédito.",
    "Eliminar un gasto fijo no borra los gastos que ya generó.",
  ],
  relacionado: [
    { label: "Movimientos", href: "/movimientos" },
    { label: "Ingresos", href: "/ingresos" },
    { label: "Categorías", href: "/categorias" },
    { label: "Ajustes (métodos de pago)", href: "/ajustes" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Recurrentes</h1>
          <InfoHelp content={RECURRENTES_HELP} size="icon" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Gastos e ingresos que se generan solos cada mes a las 00:30.
        </p>
      </div>
      <RecurringManager />
    </AppShell>
  );
}
