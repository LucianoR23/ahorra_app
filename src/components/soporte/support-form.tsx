"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bug, ImageIcon, Lightbulb, Paperclip, Video, X } from "lucide-react";
import { createTicket } from "@/lib/api/support";
import { captureClientMetadata } from "@/lib/support-metadata";
import type { TicketType } from "@/lib/api/schemas";
import { toast, toastError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";

const MAX_FILES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp,video/mp4";
const SUBJECT_MAX = 200;
const DESCRIPTION_MAX = 5000;

const TYPES = [
  { value: "bug", label: "Error", icon: Bug },
  { value: "improvement", label: "Mejora", icon: Lightbulb },
] as const satisfies readonly { value: TicketType; label: string; icon: typeof Bug }[];

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
    e.target.value = ""; // so the same file can be picked again
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
      toast.success("Gracias, recibimos tu reporte");
      router.push(`/soporte/${ticket.id}`);
    } catch (err) {
      toastError(err, "No se pudo enviar el reporte");
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label id="ticket-type">Tipo</Label>
        <Segmented aria-labelledby="ticket-type" value={type} onValueChange={setType} options={TYPES} />
      </div>

      {/* Asunto */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="subject">Asunto</Label>
          <span className="text-caption text-ink-muted">
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
        />
      </div>

      {/* Descripción */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Descripción</Label>
          <span className="text-caption text-ink-muted">
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
      <div className="flex flex-col gap-1.5">
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
          <ul className="flex flex-col gap-2">
            {files.map((f, i) => {
              const isVideo = f.type === "video/mp4";
              const Icon = isVideo ? Video : ImageIcon;
              return (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-3 rounded-xl bg-surface-2 py-1 pr-1 pl-3"
                >
                  <Icon aria-hidden className="size-4 shrink-0 text-ink-muted" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1 truncate text-body">{f.name}</span>
                  <span className="shrink-0 text-caption text-ink-muted">{humanSize(f.size)}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(i)} aria-label={`Quitar ${f.name}`}>
                    <X aria-hidden strokeWidth={1.75} />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {files.length < MAX_FILES && (
          <Button type="button" variant="secondary" className="self-start" onClick={() => fileInputRef.current?.click()}>
            <Paperclip data-icon="inline-start" />
            Agregar archivo
          </Button>
        )}
        <p className="text-caption text-ink-muted">
          Hasta 3 archivos · imágenes PNG/JPG/WebP (5 MB) o video MP4 (20 MB).
        </p>
      </div>

      <div className="safe-bottom sticky bottom-0 -mx-4 border-t border-border bg-background px-4 pt-3 pb-4 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <Button type="submit" size="lg" className="w-full" disabled={sending}>
          {sending ? "Enviando…" : "Enviar reporte"}
        </Button>
      </div>
    </form>
  );
}
