import { AppShell } from "@/components/app-shell";
import { BanksConfig } from "@/components/banks-config";
import { CardStatementsSummary } from "@/components/card-statements/card-statements-summary";
import { PaymentMethodsConfig } from "@/components/payment-methods-config";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";
import { PageHeader } from "@/components/ui/page-header";

// Design `Tarjetas`: statements on top (4.1), the card setup below (1.10a).
// "Comprometido" and installments in progress arrive with 4.2.

const TARJETAS_HELP: InfoHelpContent = {
  titulo: "Tarjetas",
  acciones: [
    "Mirá el resumen a pagar de cada tarjeta y lo que lleva el próximo, y marcalo como pagado.",
    "Cargá tus tarjetas y medios de pago, con el día de cierre y de vencimiento de cada tarjeta de crédito.",
    "Agregá los bancos que usás para agrupar tus tarjetas.",
  ],
  consideraciones: [
    "El cierre y el vencimiento definen en qué resumen cae cada gasto en cuotas.",
    "Un resumen junta las cuotas de esa tarjeta en Mi plata y en el Hogar.",
    "Desactivar un medio de pago lo oculta al cargar gastos, pero podés reactivarlo («Revivir») y su historial se mantiene.",
  ],
  relacionado: [{ label: "Movimientos", href: "/movimientos" }],
};

export default function Page() {
  return (
    <AppShell>
      <PageHeader
        title="Tarjetas"
        description="Tus resúmenes, tarjetas, medios de pago y bancos."
        action={<InfoHelp content={TARJETAS_HELP} size="icon" />}
      />
      <div className="flex flex-col gap-4">
        <CardStatementsSummary />
        <PaymentMethodsConfig />
        <BanksConfig />
      </div>
    </AppShell>
  );
}
