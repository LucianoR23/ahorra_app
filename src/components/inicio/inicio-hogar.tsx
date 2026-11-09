"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { PayDebtDialog } from "@/components/debts-manager";
import { DiscreetToggle } from "@/components/discreet-toggle";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { InstallPrompt } from "@/components/install-prompt";
import { PendingDraftsCard } from "@/components/pending-drafts-card";
import { PushProvider } from "@/components/push-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateLabel } from "@/components/ui/date-label";
import { ListRow, ListRowSkeleton } from "@/components/ui/list-row";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { useBalancesMe, useHouseholdMembers, useMonthlyReport, useRecentExpenses } from "@/lib/api/hooks";
import type { HouseholdMember, MonthlyReport } from "@/lib/api/schemas";
import { monthName } from "@/lib/committed";
import { useSpaces } from "@/lib/spaces";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

/**
 * Inicio · Hogar (design `Hogar`, plan 1.10b): what the hogar spent this
 * month and who paid it, the accounts between members, where the money
 * went and the last shared expenses.
 */
export function InicioHogar() {
  const me = useAuthStore((s) => s.user?.id ?? "");
  const { data: members } = useHouseholdMembers();
  const people = new People(members ?? [], me);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <HogarHeader people={people} />
      <InstallPrompt />
      <PushProvider />
      <EmailVerificationBanner />
      <div className="grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(420px,1fr))]">
        <SharedHero people={people} />
        <Accounts people={people} />
        <WhereItWent />
        <div className="md:col-span-full">
          <PendingDraftsCard />
        </div>
        <RecentShared people={people} className="md:col-span-full" />
      </div>
    </div>
  );
}

/** Members by id, with "vos" for the signed-in user. */
class People {
  constructor(
    readonly members: HouseholdMember[],
    readonly me: string,
  ) {}

  /** A member's first name, or "un ex miembro" when they left. */
  name(userId: string): string {
    return this.members.find((m) => m.userId === userId)?.firstName || "un ex miembro";
  }

  get others(): HouseholdMember[] {
    return this.members.filter((m) => m.userId !== this.me);
  }

  /** "vos y Ana", "vos, Ana y Juan". */
  get together(): string {
    const names = ["vos", ...this.others.map((m) => m.firstName)];
    return names.length === 1 ? "solo vos" : `${names.slice(0, -1).join(", ")} y ${names.at(-1)}`;
  }
}

function initials(m: HouseholdMember): string {
  return `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase() || "?";
}

function HogarHeader({ people }: { people: People }) {
  const { hogar } = useSpaces();
  // Me first, dark; the others in the brand color (design `Hogar`).
  const ordered = [...people.members].sort((a, b) => Number(b.userId === people.me) - Number(a.userId === people.me));

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div aria-hidden className="flex shrink-0 -space-x-2">
          {ordered.slice(0, 4).map((m) => (
            <Avatar key={m.userId} className="size-9 ring-2 ring-background">
              <AvatarFallback
                className={cn(
                  "text-caption font-semibold",
                  m.userId === people.me ? "bg-primary text-primary-foreground" : "bg-brand text-ink",
                )}
              >
                {initials(m)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <h1 className="min-w-0 truncate text-body text-ink-muted">
          <span className="font-semibold text-ink">{hogar?.name ?? "Hogar"}</span>
          {people.members.length > 0 && ` · ${people.together}`}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {/* Icon only on phones, so the hogar's name fits. */}
        <Button variant="outline" aria-label="Invitar" className="max-md:size-11 max-md:px-0" nativeButton={false} render={<Link href="/hogar" />}>
          <UserPlus aria-hidden strokeWidth={1.75} />
          <span className="max-md:sr-only">Invitar</span>
        </Button>
        <DiscreetToggle />
      </div>
    </div>
  );
}

/** "Gastaron juntos en noviembre" and what each one put. */
function SharedHero({ people }: { people: People }) {
  const { data: report, isLoading } = useMonthlyReport();
  const currency = report?.baseCurrency ?? "ARS";
  const payers = payersOf(report, people);

  return (
    <section
      aria-labelledby="shared-spent"
      className="flex flex-col gap-3 md:rounded-xl md:bg-card md:p-6 md:shadow-card md:dark:ring-1 md:dark:ring-border"
    >
      <h2 id="shared-spent" className="text-label uppercase text-ink-muted">
        Gastaron juntos{report ? ` en ${monthName(report.month)}` : ""}
      </h2>
      {isLoading ? (
        <Skeleton className="h-12 w-56" />
      ) : (
        <p className="text-display font-bold">
          <Money amount={report?.spentThisMonth ?? 0} currency={currency} />
        </p>
      )}
      {payers.length > 0 && (
        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          {payers.map((p) => (
            <div key={p.userId}>
              <dt className="text-caption text-ink-muted">{p.userId === people.me ? "Pusiste vos" : `Puso ${people.name(p.userId)}`}</dt>
              <dd className="text-body font-semibold">
                <Money amount={p.total} currency={currency} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** Every member, me first, with what they paid (zero when nothing). */
function payersOf(report: MonthlyReport | undefined, people: People) {
  if (!report || people.members.length === 0) return [];
  const paid = new Map(report.byPayer.map((p) => [p.userId, p.total]));
  const rows = people.members.map((m) => ({ userId: m.userId, total: paid.get(m.userId) ?? 0 }));
  // Someone who left but paid this month still shows.
  for (const p of report.byPayer) if (!rows.some((r) => r.userId === p.userId)) rows.push(p);
  return rows.sort((a, b) => Number(b.userId === people.me) - Number(a.userId === people.me));
}

/** "Cuentas entre ustedes": the biggest debt that involves me. */
function Accounts({ people }: { people: People }) {
  const { data, isLoading } = useBalancesMe();
  const { hogar } = useSpaces();
  const currency = hogar?.baseCurrency ?? "ARS";
  if (people.others.length === 0) return null;

  const biggest = [...(data?.owedToMe ?? []), ...(data?.owe ?? [])].sort((a, b) => b.amount - a.amount)[0];
  const owedToMe = biggest?.to === people.me;
  const other = biggest ? people.name(owedToMe ? biggest.from : biggest.to) : "";

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <h2 className="text-label uppercase text-ink-muted">Cuentas entre ustedes</h2>
        {isLoading ? (
          <Skeleton className="h-8 w-48" />
        ) : !biggest ? (
          <>
            <p className="text-title font-bold">Están al día</p>
            <p className="text-body text-ink-muted">Nadie le debe nada a nadie.</p>
          </>
        ) : (
          <>
            <p className="text-title font-bold">
              {owedToMe ? `${other} te debe ` : `Le debés a ${other} `}
              <Money amount={biggest.amount} currency={currency} />
            </p>
            <p className="text-body text-ink-muted">
              {owedToMe ? `${other} te transfiere y quedan en cero.` : `Le transferís y quedan en cero.`}
            </p>
          </>
        )}
        <div className="mt-1 flex flex-wrap gap-2">
          {biggest && (
            <PayDebtDialog
              fromUser={biggest.from}
              toUser={biggest.to}
              maxAmount={biggest.amount}
              fromLabel={biggest.from === people.me ? "Vos" : people.name(biggest.from)}
              toLabel={biggest.to === people.me ? "Vos" : people.name(biggest.to)}
              baseCurrency={currency}
              trigger={<Button className="flex-1">Registrar pago</Button>}
            />
          )}
          <Button variant="secondary" className={cn(biggest ? "" : "flex-1")} nativeButton={false} render={<Link href="/deudas" />}>
            Ver detalle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** At most four bars: the top three and "Otros" with the rest. */
export function topCategories(byCategory: MonthlyReport["byCategory"]) {
  if (byCategory.length <= 4) return byCategory.map((c) => ({ name: c.categoryName, total: c.total }));
  const rest = byCategory.slice(3).reduce((sum, c) => sum + c.total, 0);
  return [...byCategory.slice(0, 3).map((c) => ({ name: c.categoryName, total: c.total })), { name: "Otros", total: rest }];
}

/** "En qué se fue": spending by category, the first bar highlighted. */
function WhereItWent() {
  const { data: report, isLoading } = useMonthlyReport();
  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!report || report.byCategory.length === 0) return null;
  const rows = topCategories(report.byCategory);
  const max = Math.max(...rows.map((r) => r.total), 0);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h2 className="text-heading font-semibold">En qué se fue</h2>
        <ul className="flex flex-col gap-4">
          {rows.map((r, i) => (
            <li key={r.name} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3 text-body">
                <span className="truncate">{r.name}</span>
                <Money amount={r.total} currency={report.baseCurrency} className="shrink-0" />
              </div>
              <div aria-hidden className="h-2 overflow-hidden rounded-full bg-border">
                <div
                  data-testid="category-bar"
                  className={cn("h-full rounded-full", i === 0 ? "bg-brand" : "bg-ink-muted")}
                  style={{ width: `${max > 0 ? Math.max((r.total / max) * 100, 2) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** "Últimos compartidos": who paid each one and when. */
function RecentShared({ people, className }: { people: People; className?: string }) {
  const { data, isLoading } = useRecentExpenses(5);
  const expenses = data?.items ?? [];

  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-heading font-semibold">Últimos compartidos</h2>
          <Link href="/movimientos" className="text-body font-semibold text-brand-ink hover:underline">
            Ver todos
          </Link>
        </div>
        {isLoading ? (
          <div>
            {[0, 1, 2].map((i) => (
              <ListRowSkeleton key={i} />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <p className="py-2 text-body text-ink-muted">Todavía no cargaron gastos en el hogar.</p>
        ) : (
          <ul className="divide-y divide-border">
            {expenses.map((e) => (
              <li key={e.id}>
                <ListRow
                  href={`/movimientos/${e.id}`}
                  title={e.description}
                  subtitle={
                    <>
                      {e.createdBy === people.me ? "Pagaste vos" : `Pagó ${people.name(e.createdBy)}`} · <DateLabel date={e.spentAt} />
                    </>
                  }
                  trailing={<Money amount={e.amount} currency={e.currency} />}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
