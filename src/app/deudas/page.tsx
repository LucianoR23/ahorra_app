import { AppShell } from "@/components/app-shell";
import { DebtsScreen } from "@/components/debts-screen";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";
import { PageHeader } from "@/components/ui/page-header";

const DEUDAS_HELP: InfoHelpContent = {
  titulo: "Cuentas entre ustedes",
  acciones: [
    "Mirá tu saldo arriba y, debajo, quién le debe a quién en el hogar.",
    "Registrá un pago entre miembros con «Pagar» (monto, fecha y nota opcional).",
    "Filtrá el historial de pagos por miembro y por fecha (mes, rango, día específico…).",
    "Tocá un pago para ver su detalle o eliminarlo si lo cargaste por error.",
    "Mirá y ajustá cuánto le toca a cada uno en «Cómo se dividen los gastos».",
  ],
  consideraciones: [
    "Las deudas se calculan solas a partir de los gastos compartidos y los pagos registrados: no se cargan a mano.",
    "No podés registrar un pago mayor a la deuda actual entre esas dos personas.",
    "Al eliminar un pago, la deuda correspondiente se restaura.",
    "Solo el dueño del hogar edita las reglas de división, y deben sumar 100%.",
    "Para que aparezcan deudas, los gastos tienen que cargarse como compartidos.",
  ],
  relacionado: [
    { label: "Agregar gasto compartido", href: "/agregar" },
    { label: "Movimientos", href: "/movimientos" },
    { label: "Hogar y miembros", href: "/hogar" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-4">
        <PageHeader
          title="Cuentas entre ustedes"
          description="Quién le debe a quién en el hogar y los pagos entre ustedes."
          back={{ href: "/mas", label: "Volver a Más" }}
          action={<InfoHelp content={DEUDAS_HELP} size="icon" />}
          className="mb-0"
        />
        <DebtsScreen />
      </div>
    </AppShell>
  );
}
