// Browser storage keys (plan 0.15b). Brand-neutral on purpose: renaming the
// product must not drop anyone's preferences.

export const STORAGE_KEYS = {
  household: "app.household",
  rememberedEmail: "app.remembered_email",
  emailVerifyBannerDismissedAt: "app.email_verify_banner_dismissed_at",
  installDismissed: "app.install.dismissed",
  pushDismissed: "app.push.dismissed",
  /** Last "Compartido" choice in the expense form (plan 1.2). */
  expenseShared: "app.expense_shared",
  /** Discreet mode, per device (plan 1.9). */
  discreet: "app.discreet",
  /** Inicio and Reportes in pesos or dollars, per device (plan 5.3). */
  viewCurrency: "app.view_currency",
  /** IndexedDB database the service worker can read too (plan 1.9). */
  deviceDb: "app.device",
  /** Cache the service worker keeps a shared photo or text in (plan 3.4). */
  shareCache: "app.share_target",
} as const;
