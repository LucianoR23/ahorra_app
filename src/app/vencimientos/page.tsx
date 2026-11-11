import { AppShell } from "@/components/app-shell";
import { DueCalendar } from "@/components/due-calendar";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";
import { PageHeader } from "@/components/ui/page-header";

const VENCIMIENTOS_HELP: InfoHelpContent = {
  titulo: "Vencimientos",
  acciones: [
    "Mirá día por día lo que vence y lo que entra en el mes, y cambiá de mes con las flechas.",
    "Tocá un día para ver solo lo de ese día.",
    "Tocá un resumen para verlo y marcarlo como pagado, o un gasto o ingreso fijo para editarlo en Recurrentes.",
  ],
  consideraciones: [
    "Las tarjetas son tuyas: sus cierres y vencimientos aparecen en Mi plata y en el Hogar, como en Tarjetas.",
    "Los gastos e ingresos fijos son los del espacio en el que estás.",
    "Las cuotas van dentro del total de cada resumen, por eso no aparecen sueltas.",
    "Un gasto fijo pagado con tarjeta aparece el día del cobro, y después vuelve a sumar en el resumen que lo incluya.",
    "Los montos van en su moneda; los de monto variable son un estimado.",
  ],
  relacionado: [
    { label: "Tarjetas", href: "/tarjetas" },
    { label: "Recurrentes", href: "/recurrentes" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl">
        <PageHeader
          title="Vencimientos"
          description="Lo que vence y lo que entra, día por día."
          back={{ href: "/mas", label: "Volver a Más" }}
          action={<InfoHelp content={VENCIMIENTOS_HELP} size="icon" />}
        />
        <DueCalendar />
      </div>
    </AppShell>
  );
}
