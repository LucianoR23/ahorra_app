import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SupportForm } from "@/components/soporte/support-form";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";

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
      <Link
        href="/soporte"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Mis reportes
      </Link>
      <div className="mb-5">
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Nuevo reporte</h1>
          <InfoHelp content={NUEVO_REPORTE_HELP} size="icon" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Contanos qué pasó. Adjuntá capturas o un video si ayuda.
        </p>
      </div>
      <SupportForm />
    </AppShell>
  );
}
