"use client";

import { useEffect, useState } from "react";
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

let setPending: ((p: PendingConfirm | null) => void) | null = null;
const queue: PendingConfirm[] = [];

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const p: PendingConfirm = { ...options, resolve };
    if (setPending) setPending(p);
    else queue.push(p);
  });
}

export function ConfirmDialogHost() {
  const [pending, setPendingState] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    setPending = setPendingState;
    if (queue.length) setPendingState(queue.shift()!);
    return () => {
      setPending = null;
    };
  }, []);

  const close = (value: boolean) => {
    if (!pending) return;
    pending.resolve(value);
    setPendingState(null);
  };

  return (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
    >
      {pending && (
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{pending.title}</DialogTitle>
            {pending.description && (
              <DialogDescription>{pending.description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => close(false)}>
              {pending.cancelLabel ?? "Cancelar"}
            </Button>
            <Button
              variant={pending.destructive ? "destructive" : "default"}
              onClick={() => close(true)}
            >
              {pending.confirmLabel ?? "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
