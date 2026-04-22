"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, Share, Plus, X, Sparkles, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isStandalone, isIosSafari } from "@/lib/push";
import { useIsClient } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "ahorra.install.dismissed";
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
}

type Platform = "android-desktop" | "ios" | null;

function detectPlatform(): Platform {
  if (typeof window === "undefined") return null;
  if (isStandalone()) return null;
  if (isIosSafari()) return "ios";
  return null;
}

function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  const elapsedDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
  return elapsedDays < DISMISS_DAYS;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>(() => detectPlatform());
  const [dismissed, setDismissed] = useState<boolean>(() => isDismissed());
  const [iosDialogOpen, setIosDialogOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform("android-desktop");
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setPlatform(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (platform === "ios") {
      setIosDialogOpen(true);
      return;
    }
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setPlatform(null);
      }
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt, platform]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setDismissed(true);
  }, []);

  const isClient = useIsClient();
  if (!isClient || dismissed || !platform) return null;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary via-primary to-primary/80 p-px shadow-lg shadow-primary/20">
        <div className="relative rounded-[15px] bg-linear-to-br from-primary/95 to-primary/70 px-4 py-3.5">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-8 -right-8 size-24 rounded-full bg-white/20 blur-2xl"
          />
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar"
            className="absolute top-2 right-2 cursor-pointer text-primary-foreground/60 transition-colors hover:text-primary-foreground"
          >
            <X className="size-3.5" />
          </button>
          <div className="relative flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15 ring-1 ring-primary-foreground/25">
              {platform === "ios" ? (
                <Smartphone className="size-4 text-primary-foreground" />
              ) : (
                <Download className="size-4 text-primary-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-xs font-bold text-primary-foreground">
                <Sparkles className="size-3" />
                Instalá Ahorro como app
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-primary-foreground/80">
                {platform === "ios"
                  ? "Abrí en pantalla completa desde tu inicio y recibí notificaciones."
                  : "Acceso directo desde tu dispositivo, más rápido y sin navegador."}
              </p>
              <div className="mt-2.5">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  disabled={installing}
                  className="h-7 bg-primary-foreground px-3 text-[11px] font-bold text-primary hover:bg-primary-foreground/90"
                >
                  <Download className="size-3" />
                  {installing ? "Instalando…" : "Instalar app"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <IosInstallDialog open={iosDialogOpen} onOpenChange={setIosDialogOpen} />
    </>
  );
}

function IosInstallDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const steps = [
    {
      n: 1,
      icon: <Share className="size-4" />,
      title: "Tocá el botón Compartir",
      desc: "En la barra inferior de Safari.",
    },
    {
      n: 2,
      icon: <Plus className="size-4" />,
      title: "Elegí “Añadir a pantalla de inicio”",
      desc: "Desplazate hacia abajo en el menú si no lo ves.",
    },
    {
      n: 3,
      icon: <Smartphone className="size-4" />,
      title: "Confirmá “Añadir”",
      desc: "Vas a ver el ícono de Ahorro en tu pantalla principal.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Smartphone className="size-5 text-primary" />
          </div>
          <DialogTitle className="text-center">Instalar Ahorro en iPhone</DialogTitle>
          <DialogDescription className="text-center">
            Seguí estos pasos desde <strong>Safari</strong> (no funciona en Chrome en iOS).
          </DialogDescription>
        </DialogHeader>

        <ol className="flex flex-col gap-2.5">
          {steps.map((s) => (
            <li
              key={s.n}
              className="flex items-start gap-3 rounded-xl bg-muted/40 p-3 ring-1 ring-border/60"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                {s.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {s.n}
                  </span>
                  {s.title}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="rounded-xl bg-primary/5 px-3 py-2.5 text-[11px] text-muted-foreground ring-1 ring-primary/15">
          <strong className="text-foreground">Tip:</strong> en iOS 16.4 o superior, una vez instalada
          vas a poder recibir notificaciones push.
        </div>

        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className={cn("w-full")}
          size="lg"
        >
          Entendido
        </Button>
      </DialogContent>
    </Dialog>
  );
}
