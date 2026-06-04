import { AppShell } from "@/components/app-shell";
import { ExpenseForm } from "@/components/expense-form";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";

const AGREGAR_HELP: InfoHelpContent = {
  titulo: "Agregar gasto",
  acciones: [
    "Cargá monto y moneda (ARS, USD o EUR); si no es tu moneda base, ves la conversión estimada.",
    "Completá la descripción, la categoría (opcional) y la fecha del gasto.",
    "Elegí el método de pago; si admite cuotas, indicá cuántas (con tarjeta de crédito ves la facturación estimada por cuota).",
    "Compartí el gasto con el hogar y, si querés, personalizá cuánto pone cada miembro.",
    "Creá el gasto con «Crear gasto»: te lleva al detalle del movimiento.",
  ],
  consideraciones: [
    "El monto (mayor a 0), la descripción y el método de pago son obligatorios.",
    "Solo aparecen las categorías y los métodos de pago activos que ya tengas creados: si falta alguno, agregalo en Categorías o en Ajustes.",
    "Las cuotas se habilitan únicamente si el método de pago las admite; con tarjeta de crédito el gasto se divide automáticamente.",
    "Si pagás en otra moneda, la conversión que ves es estimada: la tasa exacta se congela al crear el gasto.",
    "Compartir aparece solo si tu hogar tiene más de un miembro; en división personalizada las partes deben sumar el total.",
  ],
  relacionado: [
    { label: "Movimientos", href: "/movimientos" },
    { label: "Categorías", href: "/categorias" },
    { label: "Ajustes (métodos, tarjetas y hogar)", href: "/ajustes" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Agregar gasto</h1>
          <InfoHelp content={AGREGAR_HELP} size="icon" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Registrá un gasto nuevo. Si usás tarjeta de crédito se divide automáticamente en cuotas.
        </p>
      </div>
      <ExpenseForm />
    </AppShell>
  );
}
