// Product analytics (plan 13.3). Until then every call is a no-op, so the
// steps that need tracking can already say what they track.

export type TrackEvent =
  | "onboarding_step_viewed"
  | "onboarding_step_skipped"
  | "onboarding_payment_methods_saved"
  | "onboarding_first_expense"
  | "onboarding_completed"
  | "onboarding_push"
  | "onboarding_install";

export type TrackProps = Record<string, string | number | boolean>;

export function track(event: TrackEvent, props?: TrackProps): void {
  void event;
  void props;
}
