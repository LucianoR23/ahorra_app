import { AppShell } from "@/components/app-shell";
import { ExpenseForm } from "@/components/expense-form";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";
import { PageHeader } from "@/components/ui/page-header";
import { CloseButton } from "@/components/close-button";
import { parsePrefill } from "@/lib/simulator";

const AGREGAR_HELP: InfoHelpContent = {
  titulo: "Cargar gasto",
  acciones: [
    "Contalo en una frase en «Contalo como te salga» (por ejemplo «café 2500 visa galicia 3 cuotas ayer») y apretá Enter, o tocá el micrófono y decilo (hasta 30 segundos): completa los datos de abajo para que los revises.",
    "Escribí el monto arriba y elegí la moneda (ARS, USD o EUR); si no es en pesos, ves cuánto es en pesos.",
    "Completá la descripción, la categoría (opcional), con qué pagaste y la fecha.",
    "Si el medio de pago admite cuotas, indicá cuántas; con tarjeta de crédito ves en qué resumen entra la primera.",
    "Activá «Compartido» para sumarlo al hogar y, si querés, personalizá cuánto pone cada miembro.",
    "Guardalo con «Guardar gasto»: te lleva al detalle del movimiento.",
  ],
  consideraciones: [
    "La frase solo cambia los datos que menciona. Si nombrás una tarjeta que coincide con varias (por ejemplo «visa» y tenés dos Visa), Pago queda vacío para que elijas cuál.",
    "El monto (mayor a 0), la descripción y el medio de pago son obligatorios.",
    "Solo aparecen las categorías y los medios de pago activos que ya tengas creados: si falta alguno, agregalo en Categorías o en Tarjetas.",
    "Las cuotas aparecen solo si el medio de pago las admite.",
    "Si pagás en otra moneda, la conversión que ves es estimada: la cotización se fija al guardar el gasto.",
    "«Compartido» aparece solo si tenés un hogar; en división personalizada las partes deben sumar el total.",
  ],
  relacionado: [
    { label: "Movimientos", href: "/movimientos" },
    { label: "Categorías", href: "/categorias" },
    { label: "Tarjetas", href: "/tarjetas" },
  ],
};

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // "Cargar compra" from the simulator (plan 4.8) fills the form in.
  const initial = parsePrefill(await searchParams);
  return (
    <AppShell focus>
      <div className="mx-auto w-full max-w-xl">
        <PageHeader
          title="Cargar gasto"
          className="items-center pt-2"
          action={
            <div className="flex items-center gap-2">
              <InfoHelp content={AGREGAR_HELP} size="icon" />
              <CloseButton />
            </div>
          }
        />
        <ExpenseForm initial={initial} />
      </div>
    </AppShell>
  );
}
