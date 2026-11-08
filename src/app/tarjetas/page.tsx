import { AppShell } from "@/components/app-shell";
import { BanksConfig } from "@/components/banks-config";
import { PaymentMethodsConfig } from "@/components/payment-methods-config";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";
import { PageHeader } from "@/components/ui/page-header";

// Plan 1.10a: the card setup lives here (design `Tarjetas`). Statements,
// "Comprometido" and installments in progress arrive with 4.1 to 4.3.

const TARJETAS_HELP: InfoHelpContent = {
  titulo: "Tarjetas",
  acciones: [
    "Cargá tus tarjetas y medios de pago, con el día de cierre y de vencimiento de cada tarjeta de crédito.",
    "Agregá los bancos que usás para agrupar tus tarjetas.",
  ],
  consideraciones: [
    "El cierre y el vencimiento definen en qué resumen cae cada gasto en cuotas.",
    "Desactivar un medio de pago lo oculta al cargar gastos, pero podés reactivarlo («Revivir») y su historial se mantiene.",
  ],
  relacionado: [{ label: "Movimientos", href: "/movimientos" }],
};

export default function Page() {
  return (
    <AppShell>
      <PageHeader
        title="Tarjetas"
        description="Tus tarjetas, medios de pago y bancos."
        action={<InfoHelp content={TARJETAS_HELP} size="icon" />}
      />
      <div className="flex flex-col gap-4">
        <PaymentMethodsConfig />
        <BanksConfig />
      </div>
    </AppShell>
  );
}
