import { AppShell } from "@/components/app-shell";
import { PurchaseSimulator } from "@/components/purchase-simulator";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";
import { PageHeader } from "@/components/ui/page-header";

const SIMULAR_HELP: InfoHelpContent = {
  titulo: "¿Me lo puedo comprar?",
  acciones: [
    "Escribí el monto, elegí con qué pagarías y, si es con tarjeta, en cuántas cuotas.",
    "Mirá mes a mes cuánto vas a tener en tarjetas, qué parte de tu ingreso es y cuánto te queda después de los fijos.",
    "Fijate cómo quedan los resúmenes de esa tarjeta y si la compra te hace pasar de algún límite.",
    "Compará cuotas contra contado con lo que rinde tu plata por mes.",
    "Si te cierra, tocá «Cargar compra»: abre Cargar gasto con los datos completos.",
  ],
  consideraciones: [
    "No se guarda nada hasta que cargues la compra.",
    "El ingreso sale de tus ingresos recurrentes, y los fijos de tus gastos recurrentes del espacio en el que estás.",
    "Las tarjetas son las tuyas, con lo que ya tienen en cuotas. Los montos en otra moneda usan la cotización de hoy.",
  ],
  relacionado: [
    { label: "Tarjetas", href: "/tarjetas" },
    { label: "Recurrentes", href: "/recurrentes" },
    { label: "Objetivos", href: "/objetivos" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl">
        <PageHeader
          title="¿Me lo puedo comprar?"
          description="Mirá cómo te queda una compra antes de hacerla."
          action={<InfoHelp content={SIMULAR_HELP} size="icon" />}
        />
        <PurchaseSimulator />
      </div>
    </AppShell>
  );
}
