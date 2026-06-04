import { AppShell } from "@/components/app-shell";
import { SupportList } from "@/components/soporte/support-list";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";

const SOPORTE_HELP: InfoHelpContent = {
  titulo: "Soporte",
  acciones: [
    "Creá un reporte de «Error» o «Mejora» con «Nuevo reporte».",
    "Filtrá con «Solo abiertos» para ver los reportes que siguen en juego.",
    "Tocá un reporte para ver su estado, los adjuntos y la conversación con el equipo.",
    "Traé reportes más viejos con «Cargar más».",
  ],
  consideraciones: [
    "Acá ves solo tus reportes: son personales, no se comparten con el resto del hogar.",
    "Cada reporte muestra su estado, y los íconos indican la cantidad de adjuntos y respuestas.",
  ],
  relacionado: [{ label: "Nuevo reporte", href: "/soporte/nuevo" }],
};

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Soporte</h1>
          <InfoHelp content={SOPORTE_HELP} size="icon" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Reportá errores o sugerí mejoras. Seguí el estado de tus reportes acá.
        </p>
      </div>
      <SupportList />
    </AppShell>
  );
}
