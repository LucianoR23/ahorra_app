"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { selectSpace, useSpaces } from "@/lib/spaces";
import { cn } from "@/lib/utils";

/**
 * "Yo · Hogar" (plan 1.2): switches between "Mi plata" and the hogar. Users
 * without a hogar never see it.
 */
export function SpaceTabs({ className }: { className?: string }) {
  const { personal, hogar, current } = useSpaces();
  if (!personal || !hogar || !current) return null;

  return (
    <Tabs
      value={current.id}
      onValueChange={(id) => selectSpace(String(id))}
      className={cn("w-full", className)}
    >
      <TabsList className="w-full" aria-label="Espacio">
        <TabsTrigger value={personal.id}>Yo</TabsTrigger>
        <TabsTrigger value={hogar.id} title={hogar.name}>
          Hogar
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
