import { AppShell } from "@/components/app-shell";
import { DebtsManager } from "@/components/debts-manager";
import { SplitRulesCard } from "@/components/split-rules-card";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";

const DEUDAS_HELP: InfoHelpContent = {
  titulo: "Deudas",
  acciones: [
    "Mirá tu balance neto y la matriz de quién le debe a quién en el hogar.",
    "Registrá un pago entre miembros con «Pagar» (monto, fecha y nota opcional).",
    "Filtrá el historial de pagos por miembro y por fecha (mes, rango, día específico…).",
    "Abrí el detalle de un pago o eliminalo si lo cargaste por error.",
    "Ajustá los porcentajes de división del hogar en «Reglas de división».",
  ],
  consideraciones: [
    "Las deudas se calculan solas a partir de los gastos compartidos y los pagos registrados: no se cargan a mano.",
    "No podés registrar un pago mayor a la deuda actual entre esas dos personas.",
    "Al eliminar un pago, la deuda correspondiente se restaura.",
    "Solo el dueño del hogar edita las reglas de división, y deben sumar 100%.",
    "Para que aparezcan deudas, los gastos tienen que cargarse como compartidos en Agregar gasto.",
  ],
  relacionado: [
    { label: "Agregar gasto compartido", href: "/agregar" },
    { label: "Movimientos", href: "/movimientos" },
    { label: "Ajustes (hogar y miembros)", href: "/ajustes" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Deudas</h1>
          <InfoHelp content={DEUDAS_HELP} size="icon" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Quién le debe a quién y pagos entre miembros del hogar.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <DebtsManager />
        <SplitRulesCard />
      </div>
    </AppShell>
  );
}
