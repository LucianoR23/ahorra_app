"use client";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { MenuGroup, MenuRow } from "@/components/ui/menu-list";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminOverview } from "@/lib/api/hooks";

const num = new Intl.NumberFormat("es-AR");

/** "2026-11" → "noviembre 2026". */
function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: "UTC" });
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">{label}</span>
        <span className="text-[1.75rem] leading-tight font-extrabold tracking-tight text-ink tabular-nums">{num.format(value)}</span>
        {hint ? <span className="text-caption text-ink-muted">{hint}</span> : null}
      </CardContent>
    </Card>
  );
}

/**
 * Superadmin home (plan 1.11): counts only. Following plan §8b there are no
 * amounts here, only how many accounts, hogares and movements there are.
 */
export function AdminOverview() {
  const { data, error, isLoading } = useAdminOverview();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Resumen" description="Solo conteos: ningún monto ni dato de adentro de un espacio." className="mb-0" />
      {error ? (
        <Alert variant="error">No se pudo cargar el resumen.</Alert>
      ) : isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <section aria-label="Cuentas y hogares" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Cuentas"
              value={data.accounts.total}
              hint={`${num.format(data.accounts.newWeek)} nuevas en 7 días · ${num.format(data.accounts.newMonth)} este mes`}
            />
            <Stat label="Activas en 30 días" value={data.accounts.active} hint={`${num.format(data.accounts.verified)} con email verificado`} />
            <Stat label="Hogares" value={data.households.active} hint={`${num.format(data.households.deleted)} borrados`} />
            <Stat label="Lista de espera" value={data.waitlist} hint="Emails confirmados" />
          </section>
          <MenuGroup title="Movimientos cargados" footer="Por fecha de carga, no por la fecha del gasto.">
            {[...(data.movements ?? [])].reverse().map((m) => (
              <MenuRow key={m.month} className="justify-between">
                <span className="capitalize">{monthLabel(m.month)}</span>
                <span className="text-right text-caption text-ink-muted tabular-nums">
                  {num.format(m.expenses)} gastos · {num.format(m.incomes)} ingresos
                </span>
              </MenuRow>
            ))}
          </MenuGroup>
        </>
      )}
    </div>
  );
}
