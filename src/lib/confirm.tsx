"use client";

import { useSyncExternalStore } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PendingConfirm = ConfirmOptions & { resolve: (v: boolean) => void };

// Store imperativo fuera de React: confirm() puede llamarse desde cualquier
// handler. El host se suscribe con useSyncExternalStore (el patrón canónico
// para stores externos) en vez de registrar el setter vía useEffect — así
// evitamos el setState-in-effect que desaconseja el React Compiler.
let pending: PendingConfirm | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): PendingConfirm | null {
  return pending;
}

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    pending = { ...options, resolve };
    emit();
  });
}

export function ConfirmDialogHost() {
  const current = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const close = (value: boolean) => {
    if (!current) return;
    current.resolve(value);
    pending = null;
    emit();
  };

  return (
    <Dialog
      open={current !== null}
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
    >
      {current && (
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{current.title}</DialogTitle>
            {current.description && (
              <DialogDescription>{current.description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => close(false)}>
              {current.cancelLabel ?? "Cancelar"}
            </Button>
            <Button
              variant={current.destructive ? "destructive" : "default"}
              onClick={() => close(true)}
            >
              {current.confirmLabel ?? "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
