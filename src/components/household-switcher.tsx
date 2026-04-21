"use client";

import { Check, ChevronsUpDown, Home, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useHouseholds } from "@/lib/api/hooks";
import { useHouseholdStore } from "@/stores/household";
import { cn } from "@/lib/utils";

export function HouseholdSwitcher({ className }: { className?: string }) {
  const router = useRouter();
  const { data: households } = useHouseholds();
  const currentId = useHouseholdStore((s) => s.currentId);
  const setCurrentId = useHouseholdStore((s) => s.setCurrentId);

  const current = households?.find((h) => h.id === currentId) ?? households?.[0];
  const label = current?.name ?? "Hogar";

  function pick(id: string) {
    if (id === currentId) return;
    setCurrentId(id);
    // Drop every household-scoped key — fetcher rebuilds with the new X-Household-ID.
    mutate(() => true, undefined, { revalidate: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-[10px] border border-border bg-card px-2.5 py-2 text-left text-xs font-semibold transition-colors hover:bg-muted",
          className,
        )}
      >
        <Home className="size-3.5 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {current?.baseCurrency && (
          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
            {current.baseCurrency}
          </span>
        )}
        <ChevronsUpDown className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-50">
        <DropdownMenuLabel>Cambiar hogar</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {households?.map((h) => {
          const active = h.id === currentId;
          return (
            <DropdownMenuItem key={h.id} onClick={() => pick(h.id)}>
              <span className="flex-1 truncate">{h.name}</span>
              <span className="text-[10px] text-muted-foreground">{h.baseCurrency}</span>
              {active && <Check className="ml-1 size-3.5" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/ajustes/hogares/nuevo")}>
          <Plus className="mr-1 size-3.5" />
          <span className="flex-1">Crear hogar nuevo</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
