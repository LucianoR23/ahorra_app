import { AppShell } from "@/components/app-shell";
import { NotificationPreferences } from "@/components/notification-preferences";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";
import { PageHeader } from "@/components/ui/page-header";

const HELP: InfoHelpContent = {
  titulo: "Preferencias de notificaciones",
  acciones: [
    "Elegí qué avisos te llegan en la app, como push o por email.",
    "Si querés, prendé un recordatorio diario: a la hora que elijas te pregunta si no gastaste nada, solo los días que no cargaste nada.",
    "Elegí un horario de silencio: las push que lleguen en ese rato te esperan hasta que termine.",
  ],
  consideraciones: [
    "Valen para todos tus espacios: Mi plata y el hogar.",
    "Si apagás un aviso en la app, también se ocultan los que ya tenías. Si lo volvés a prender, aparecen de nuevo.",
    "Las invitaciones a un hogar y los avisos de seguridad te llegan siempre.",
    "El recordatorio diario no espera al final del silencio: si cae adentro, ese día no llega.",
    "Para recibir push, activalas en cada dispositivo.",
  ],
  relacionado: [
    { label: "Notificaciones", href: "/notificaciones" },
    { label: "Seguridad y privacidad", href: "/seguridad" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-4">
        <PageHeader
          title="Preferencias de notificaciones"
          description="Qué te avisamos, por dónde y a qué hora."
          back={{ href: "/ajustes", label: "Volver a Ajustes" }}
          action={<InfoHelp content={HELP} size="icon" />}
          className="mb-0"
        />
        <NotificationPreferences />
      </div>
    </AppShell>
  );
}
