import { AppShell } from "@/components/app-shell";
import { RecurringManager } from "@/components/recurring-manager";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";

const RECURRENTES_HELP: InfoHelpContent = {
  titulo: "Recurrentes",
  acciones: [
    "Alterná entre «Gastos fijos» e «Ingresos fijos» con las pestañas.",
    "Creá un gasto o ingreso fijo con el botón + y elegí su frecuencia (semanal, mensual o anual) y fecha de inicio.",
    "Marcá un gasto como «Importe variable» (luz, expensas, wifi): el monto es un estimado y cada mes confirmás la factura real.",
    "Tocá una serie para editarla, pausarla o eliminarla; en los gastos fijos también ves su histórico.",
    "En un importe variable podés pedir que te avisemos si la factura sube más de un porcentaje respecto de la anterior.",
    "Si cargás a mano algo que se repite todos los meses (Netflix, el gimnasio), te lo sugerimos arriba: agregalo como fijo o tocá «No es fijo».",
  ],
  consideraciones: [
    "Las series se materializan solas cada mes a las 00:30: no tenés que cargarlas a mano.",
    "La fecha de inicio no se puede cambiar después de crear la serie, y al crear solo podés arrancar dentro del mes en curso hacia adelante.",
    "En importe variable las cuotas quedan fijadas en 1 (no se puede repartir un monto que todavía no se conoce).",
    "Las cuotas por cargo solo están disponibles con tarjeta de crédito.",
    "Eliminar un gasto fijo no borra los gastos que ya generó.",
    "Una sugerencia aparece cuando el mismo gasto está en al menos 3 de los últimos 4 meses, una vez por mes y con montos parecidos. Si la descartás, deja de aparecer para todo el espacio.",
  ],
  relacionado: [
    { label: "Movimientos", href: "/movimientos" },
    { label: "Ingresos", href: "/ingresos" },
    { label: "Categorías", href: "/categorias" },
    { label: "Tarjetas", href: "/tarjetas" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <RecurringManager help={<InfoHelp content={RECURRENTES_HELP} size="icon" />} />
    </AppShell>
  );
}
