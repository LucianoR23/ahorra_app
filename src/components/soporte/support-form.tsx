"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bug, Lightbulb, Paperclip, X, ImageIcon, Video, Loader2 } from "lucide-react";
import { createTicket } from "@/lib/api/support";
import { captureClientMetadata } from "@/lib/support-metadata";
import type { TicketType } from "@/lib/api/schemas";
import { toast, toastError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MAX_FILES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp,video/mp4";
const SUBJECT_MAX = 200;
const DESCRIPTION_MAX = 5000;

const TYPES: { value: TicketType; label: string; icon: typeof Bug }[] = [
  { value: "bug", label: "Error", icon: Bug },
  { value: "improvement", label: "Mejora", icon: Lightbulb },
];

function validateFile(f: File): string | null {
  const isVideo = f.type === "video/mp4";
  const isImage = ["image/png", "image/jpeg", "image/webp"].includes(f.type);
  if (!isVideo && !isImage) return "Formato no soportado (solo PNG, JPG, WebP, MP4).";
  if (isImage && f.size > MAX_IMAGE_BYTES) return "La imagen supera los 5 MB.";
  if (isVideo && f.size > MAX_VIDEO_BYTES) return "El video supera los 20 MB.";
  return null;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SupportForm() {
  const router = useRouter();
  const [type, setType] = useState<TicketType>("bug");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // permitir re-elegir el mismo archivo
    if (!picked.length) return;

    setFiles((prev) => {
      const next = [...prev];
      for (const f of picked) {
        if (next.length >= MAX_FILES) {
          toast.error("Máximo 3 archivos por reporte.");
          break;
        }
        const err = validateFile(f);
        if (err) {
          toast.error(err);
          continue;
        }
        next.push(f);
      }
      return next;
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    if (!subject.trim() || !description.trim()) {
      toast.error("Completá el asunto y la descripción.");
      return;
    }
    setSending(true);
    try {
      const ticket = await createTicket({
        type,
        subject: subject.trim(),
        description: description.trim(),
        files,
        metadata: captureClientMetadata(),
      });
      toast.success("¡Gracias! Tu reporte fue enviado.");
      router.push(`/soporte/${ticket.id}`);
    } catch (err) {
      toastError(err, "No se pudo enviar el reporte");
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Tipo */}
      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const active = type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                aria-pressed={active}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Asunto */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="subject">Asunto</Label>
          <span className="text-[11px] text-ink-faint">
            {subject.length}/{SUBJECT_MAX}
          </span>
        </div>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={SUBJECT_MAX}
          placeholder="Resumí el problema o la idea"
          required
          className="h-9"
        />
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Descripción</Label>
          <span className="text-[11px] text-ink-faint">
            {description.length}/{DESCRIPTION_MAX}
          </span>
        </div>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={DESCRIPTION_MAX}
          placeholder="Contanos qué pasó, qué esperabas y cómo reproducirlo."
          required
          className="min-h-32"
        />
      </div>

      {/* Adjuntos */}
      <div className="space-y-1.5">
        <Label>Adjuntos (opcional)</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={onPickFiles}
          className="hidden"
        />
        {files.length > 0 && (
          <ul className="space-y-1.5">
            {files.map((f, i) => {
              const isVideo = f.type === "video/mp4";
              const Icon = isVideo ? Video : ImageIcon;
              return (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-xs">{f.name}</span>
                  <span className="shrink-0 text-[11px] text-ink-faint">{humanSize(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    aria-label={`Quitar ${f.name}`}
                    className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {files.length < MAX_FILES && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip data-icon="inline-start" />
            Agregar archivo
          </Button>
        )}
        <p className="text-[11px] text-ink-faint">
          Hasta 3 archivos · imágenes PNG/JPG/WebP (5 MB) o video MP4 (20 MB).
        </p>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={sending} className="min-w-32">
          {sending ? (
            <>
              <Loader2 data-icon="inline-start" className="animate-spin" />
              Enviando…
            </>
          ) : (
            "Enviar reporte"
          )}
        </Button>
      </div>
    </form>
  );
}
