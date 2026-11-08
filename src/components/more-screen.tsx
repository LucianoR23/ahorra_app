"use client";

import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import { DevSignature } from "@/components/dev-signature";
import { UserAvatar } from "@/components/user-avatar";
import { MenuGroup, MenuItem } from "@/components/ui/menu-list";
import { PageHeader } from "@/components/ui/page-header";
import { MORE_GROUPS, visibleFor } from "@/lib/nav";
import { useSpaces } from "@/lib/spaces";
import { useLogout } from "@/lib/use-logout";
import { useAuthStore } from "@/stores/auth";

/** "Más" (design `Mas`): profile on top, then grouped links. */
export function MoreScreen() {
  const user = useAuthStore((s) => s.user);
  const { hogar } = useSpaces();
  const logout = useLogout();
  const ctx = { isAdmin: Boolean(user?.isSuperadmin), hasHogar: Boolean(hogar) };

  return (
    <div className="flex flex-col gap-6 pb-4">
      <PageHeader title="Más" className="mb-0" />

      <Link
        href="/ajustes"
        className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-card transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus dark:ring-1 dark:ring-border"
      >
        <UserAvatar className="size-11" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-heading text-ink">
            {user ? `${user.firstName} ${user.lastName}` : "Tu cuenta"}
          </span>
          <span className="block text-caption text-ink-muted">Perfil y cuenta</span>
        </span>
        <ChevronRight aria-hidden className="size-5 text-ink-muted" strokeWidth={1.75} />
      </Link>

      {MORE_GROUPS.map((group) => {
        const items = group.items.filter((item) => visibleFor(item, ctx));
        if (!items.length) return null;
        return (
          <MenuGroup key={group.title} title={group.title}>
            {items.map((item) => (
              <MenuItem key={item.id} icon={item.icon} label={item.label} href={item.href} />
            ))}
            {group.title === "Cuenta" ? (
              <MenuItem icon={LogOut} label="Cerrar sesión" tone="destructive" onClick={() => void logout()} />
            ) : null}
          </MenuGroup>
        );
      })}

      <DevSignature size={13} />
    </div>
  );
}
