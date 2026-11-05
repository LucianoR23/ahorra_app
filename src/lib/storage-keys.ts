// Browser storage keys (plan 0.15b). Brand-neutral on purpose: renaming the
// product must not drop anyone's preferences. Importing this module migrates
// the old brand-prefixed keys once, before any reader uses them.

export const STORAGE_KEYS = {
  household: "app.household",
  rememberedEmail: "app.remembered_email",
  emailVerifyBannerDismissedAt: "app.email_verify_banner_dismissed_at",
  installDismissed: "app.install.dismissed",
  pushDismissed: "app.push.dismissed",
} as const;

/** Old key → new key. */
export const LEGACY_STORAGE_KEYS: Record<string, string> = {
  "ahorro.household": STORAGE_KEYS.household,
  "ahorra.remembered_email": STORAGE_KEYS.rememberedEmail,
  "ahorra.emailVerifyBannerDismissedAt": STORAGE_KEYS.emailVerifyBannerDismissedAt,
  "ahorra.install.dismissed": STORAGE_KEYS.installDismissed,
  "ahorra.push.dismissed": STORAGE_KEYS.pushDismissed,
};

/**
 * Moves each old key to its new name (a value already under the new name
 * wins) and deletes the old one. Safe to call more than once; a no-op on the
 * server or when storage is unavailable.
 */
export function migrateLegacyStorage(storage: Storage | undefined = globalThis.localStorage) {
  if (!storage) return;
  try {
    for (const [oldKey, newKey] of Object.entries(LEGACY_STORAGE_KEYS)) {
      const value = storage.getItem(oldKey);
      if (value === null) continue;
      if (storage.getItem(newKey) === null) storage.setItem(newKey, value);
      storage.removeItem(oldKey);
    }
  } catch {
    // Storage disabled (private mode, quota): nothing to migrate.
  }
}

migrateLegacyStorage();
