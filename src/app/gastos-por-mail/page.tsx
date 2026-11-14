import { AppShell } from "@/components/app-shell";
import { InboundEmail } from "@/components/inbound-email";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";
import { PageHeader } from "@/components/ui/page-header";

const HELP: InfoHelpContent = {
  titulo: "Gastos por mail",
  acciones: [
    "Copiá tu dirección y agregala en Gmail como dirección de reenvío; el código que manda Gmail aparece en esta pantalla.",
    "Creá un filtro en Gmail que reenvíe los avisos de tu banco o de Mercado Pago a tu dirección.",
    "Cada aviso que llega te espera en «Para revisar»: tocá «Cargar» y se abre Cargar gasto con los datos completados.",
  ],
  consideraciones: [
    "Nada se guarda como gasto hasta que lo revisás y tocás «Guardar gasto».",
    "Los mails reenviados desde otra casilla que la de tu cuenta te preguntan primero si son tuyos.",
    "Del mail solo guardamos lo que dice del gasto, nunca el mail entero.",
    "Los avisos de plata que te entra, resúmenes y vencimientos no se cargan.",
  ],
  relacionado: [
    { label: "Cargar gasto", href: "/agregar" },
    { label: "Movimientos", href: "/movimientos" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-4">
        <PageHeader
          title="Gastos por mail"
          description="Reenviá los avisos de tu banco y cargalos en un toque."
          back={{ href: "/mas", label: "Volver a Más" }}
          action={<InfoHelp content={HELP} size="icon" />}
          className="mb-0"
        />
        <InboundEmail />
      </div>
    </AppShell>
  );
}
