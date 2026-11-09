"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { InicioHogar } from "@/components/inicio/inicio-hogar";
import { InicioYo } from "@/components/inicio/inicio-yo";
import { useSpaces } from "@/lib/spaces";

/** Inicio: Yo in Mi plata (plan 4.2), Hogar in the hogar (plan 1.10b). */
export function Dashboard() {
  const { inHogar, isLoading } = useSpaces();
  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  return inHogar ? <InicioHogar /> : <InicioYo />;
}
