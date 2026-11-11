"use client";

import { Label } from "@/components/ui/label";
import { MenuGroup, MenuRow } from "@/components/ui/menu-list";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useNotificationPreferences,
  type NotificationChannel,
  type NotificationKind,
  type NotificationPreferences as Prefs,
} from "@/lib/api/hooks";
import { putNotificationPreferences } from "@/lib/api/mutations";
import { toast, toastError } from "@/lib/toast";

const KIND_COPY: Record<NotificationKind, { title: string; hint: string }> = {
  shared_expense: { title: "Gastos compartidos", hint: "Cuando alguien carga, cambia o saca un gasto que se divide con vos." },
  settlement: { title: "Pagos entre ustedes", hint: "Cuando alguien te registra un pago." },
  cards: { title: "Tarjetas", hint: "El día antes del cierre y tres días antes del vencimiento." },
  installments: { title: "Cuotas por vencer", hint: "Tres días antes de que venza una cuota." },
  goals: { title: "Presupuestos y objetivos", hint: "Cuando un presupuesto llega al 80% o un ahorro viene atrasado." },
  recurring: { title: "Subas de recurrentes", hint: "Cuando un gasto recurrente sube más que su alerta." },
  weekly_review: { title: "Resumen semanal", hint: "Los domingos, cómo te fue en la semana." },
  monthly_report: { title: "Resumen mensual", hint: "El día 1, el resumen del mes anterior." },
};

const CHANNEL_LABEL: Record<NotificationChannel, string> = { in_app: "App", push: "Push", email: "Email" };
const CHANNEL_ORDER: NotificationChannel[] = ["in_app", "push", "email"];

/** Every half hour of the day, "00:00" to "23:30". */
const HALF_HOURS = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

/** The saved time plus the half hours, so a time set elsewhere still shows. */
function timeOptions(current: string) {
  return HALF_HOURS.includes(current) ? HALF_HOURS : [...HALF_HOURS, current].sort();
}

/** "America/Argentina/Buenos_Aires" -> "Buenos Aires". */
function cityOf(tz?: string) {
  return tz ? (tz.split("/").pop() ?? tz).replaceAll("_", " ") : "";
}

/** Notification preferences (plan 10.1): per kind and channel, plus quiet hours. Saves on every change. */
export function NotificationPreferences() {
  const { data, mutate, error } = useNotificationPreferences();

  async function save(next: Prefs) {
    try {
      await mutate(putNotificationPreferences(next), { optimisticData: next, rollbackOnError: true, revalidate: false });
    } catch (e) {
      toastError(e, "No se pudo guardar");
    }
  }

  if (error && !data) {
    return <p className="text-body text-ink-muted">No pudimos cargar tus preferencias. Probá de nuevo en un rato.</p>;
  }
  if (!data) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  function setChannel(kind: NotificationKind, channel: NotificationChannel, on: boolean) {
    void save({
      ...data!,
      kinds: data!.kinds.map((k) => (k.kind === kind ? { ...k, channels: { ...k.channels, [channel]: on } } : k)),
    });
  }

  function setQuiet(patch: Partial<Prefs["quietHours"]>) {
    const quietHours = { ...data!.quietHours, ...patch };
    if (quietHours.start === quietHours.end) {
      toast.error("El silencio tiene que terminar a otra hora que empieza");
      return;
    }
    void save({ ...data!, quietHours });
  }

  const q = data.quietHours;
  const city = cityOf(data.timezone);

  return (
    <div className="flex flex-col gap-6">
      <MenuGroup title="Qué te avisamos" footer="Las invitaciones a un hogar y los avisos de seguridad te llegan siempre.">
        {data.kinds.map((k) => (
          <MenuRow key={k.kind} className="items-start">
            <div className="min-w-0 flex-1">
              <p className="text-body">{KIND_COPY[k.kind]?.title ?? k.kind}</p>
              <p className="text-caption text-ink-muted">{KIND_COPY[k.kind]?.hint}</p>
            </div>
            <div className="flex shrink-0 gap-3">
              {CHANNEL_ORDER.filter((c) => c in k.channels).map((c) => {
                const id = `notif-${k.kind}-${c}`;
                return (
                  <div key={c} className="flex w-11 flex-col items-center gap-1">
                    <Label htmlFor={id} className="text-caption font-normal text-ink-muted">
                      {CHANNEL_LABEL[c]}
                    </Label>
                    <Switch
                      id={id}
                      aria-label={`${KIND_COPY[k.kind]?.title ?? k.kind}: ${CHANNEL_LABEL[c]}`}
                      checked={k.channels[c] === true}
                      onCheckedChange={(on) => setChannel(k.kind, c, on)}
                    />
                  </div>
                );
              })}
            </div>
          </MenuRow>
        ))}
      </MenuGroup>

      <MenuGroup
        title="Horario de silencio"
        footer={`Las push que lleguen en ese horario te esperan hasta que termine. En la app aparecen igual.${city ? ` Hora de ${city}.` : ""}`}
      >
        <MenuRow>
          <div className="min-w-0 flex-1">
            <Label htmlFor="quiet-enabled" className="text-body font-normal">
              Silenciar push de noche
            </Label>
            <p className="text-caption text-ink-muted">
              {q.enabled ? `De ${q.start} a ${q.end}.` : "Apagado: las push llegan a cualquier hora."}
            </p>
          </div>
          <Switch id="quiet-enabled" checked={q.enabled} onCheckedChange={(enabled) => setQuiet({ enabled })} />
        </MenuRow>
        {q.enabled ? (
          <>
            <TimeRow id="quiet-start" label="Desde" value={q.start} onChange={(start) => setQuiet({ start })} />
            <TimeRow id="quiet-end" label="Hasta" value={q.end} onChange={(end) => setQuiet({ end })} />
          </>
        ) : null}
      </MenuGroup>
    </div>
  );
}

function TimeRow({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <MenuRow>
      <Label htmlFor={id} className="min-w-0 flex-1 text-body font-normal">
        {label}
      </Label>
      <Select value={value} onValueChange={(v) => v && v !== value && onChange(v)}>
        <SelectTrigger id={id} className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {timeOptions(value).map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </MenuRow>
  );
}
