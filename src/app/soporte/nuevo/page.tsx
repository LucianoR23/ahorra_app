import { AppShell } from "@/components/app-shell";
import { SupportForm } from "@/components/soporte/support-form";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";
import { PageHeader } from "@/components/ui/page-header";

const NUEVO_REPORTE_HELP: InfoHelpContent = {
  titulo: "Nuevo reporte",
  acciones: [
    "Elegí el tipo: «Error» (algo falla) o «Mejora» (una idea).",
    "Escribí un asunto (hasta 200 caracteres) y una descripción detallada (hasta 5000).",
    "Adjuntá hasta 3 archivos: imágenes PNG/JPG/WebP (5 MB) o un video MP4 (20 MB).",
    "Enviá el reporte: te lleva a su detalle para seguirlo.",
  ],
  consideraciones: [
    "El asunto y la descripción son obligatorios; los adjuntos son opcionales.",
    "Para que podamos reproducirlo, contá qué hacías, qué esperabas y qué pasó.",
    "Tus reportes son personales: no los ven los demás miembros del hogar.",
  ],
  relacionado: [{ label: "Mis reportes", href: "/soporte" }],
};

export default function Page() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <PageHeader
          title="Nuevo reporte"
          description="Contanos qué pasó. Si ayuda, sumá capturas o un video."
          back={{ href: "/soporte", label: "Volver a Soporte" }}
          action={<InfoHelp content={NUEVO_REPORTE_HELP} size="icon" />}
          className="mb-0"
        />
        <SupportForm />
      </div>
    </AppShell>
  );
}
