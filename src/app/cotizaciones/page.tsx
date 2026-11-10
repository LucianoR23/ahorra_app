import { AppShell } from "@/components/app-shell";
import { RateHistory } from "@/components/rate-history";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";
import { PageHeader } from "@/components/ui/page-header";

const COTIZACIONES_HELP: InfoHelpContent = {
  titulo: "Cotizaciones",
  acciones: [
    "Elegí el dólar (MEP, Blue, Oficial, Tarjeta y otros) y el período: 30 días, 6 meses o un año.",
    "Mirá el precio de hoy y cuánto se movió en el período.",
  ],
  consideraciones: [
    "Es el precio de venta, el que usa la app para pasar a pesos tus gastos e ingresos en dólares.",
    "Hay un valor por día: el último que publicó la fuente ese día.",
    "El dólar con el que convierte cada espacio se elige en Ajustes (Mi plata) y en Hogar.",
  ],
  relacionado: [
    { label: "Ajustes", href: "/ajustes" },
    { label: "Movimientos", href: "/movimientos" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl">
        <PageHeader
          title="Cotizaciones"
          description="Cómo se movió el dólar."
          back={{ href: "/mas", label: "Volver a Más" }}
          action={<InfoHelp content={COTIZACIONES_HELP} size="icon" />}
        />
        <RateHistory />
      </div>
    </AppShell>
  );
}
