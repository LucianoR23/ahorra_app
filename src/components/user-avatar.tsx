"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

/** The signed-in user's initials in a dark circle (design `Mas`). */
export function UserAvatar({ className }: { className?: string }) {
  const user = useAuthStore((s) => s.user);
  const initials = user ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() : "";
  return (
    <Avatar className={cn("after:border-0", className)} aria-hidden>
      <AvatarFallback className="bg-primary font-semibold text-primary-foreground">{initials}</AvatarFallback>
    </Avatar>
  );
}
