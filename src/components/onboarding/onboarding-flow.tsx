"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { mutate as swrMutate } from "swr";
import { useBanks, usePaymentMethods } from "@/lib/api/hooks";
import { completeOnboarding, createBank, createPaymentMethod, patchMe } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/errors";
import { isoToday } from "@/lib/format";
import { isIosSafari, isStandalone } from "@/lib/push";
import { toastError } from "@/lib/toast";
import { track } from "@/lib/track";
import {
  bankOptions,
  cardDrafts,
  cardInput,
  findByName,
  otherMethodInputs,
  type CardDraft,
  type PayOption,
} from "@/lib/onboarding";
import { canAskPush, enablePush } from "@/components/push-provider";
import { useAuthStore } from "@/stores/auth";
import { CardsStep } from "./cards-step";
import { PayStep } from "./pay-step";
import { ExpenseStep, InstallStep, NameStep, PushStep, type InstallPlatform } from "./simple-steps";

type Step = "name" | "pay" | "cards" | "expense" | "push" | "install";

interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt: () => Promise<void>;
}

function message(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

function refreshPaymentData() {
  void swrMutate(
    (k) => Array.isArray(k) && typeof k[0] === "string" && (k[0].startsWith("/payment-methods") || k[0] === "/banks"),
    undefined,
    { revalidate: true },
  );
}

/**
 * Plan 1.3: name → ¿Cómo pagás? → cards → first expense, then push and
 * install. Finishing the first expense, or skipping it, marks onboarding
 * done; push and install come after and never block.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: paymentMethods } = usePaymentMethods();
  const { data: banks } = useBanks();

  const [step, setStep] = useState<Step>("name");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [selected, setSelected] = useState<ReadonlySet<PayOption>>(new Set());
  const [hasMpCard, setHasMpCard] = useState(false);
  const [drafts, setDrafts] = useState<CardDraft[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  // Someone who already finished it lands here only by typing the URL.
  const [doneAtStart] = useState(() => !!user?.onboardedAt);

  useEffect(() => {
    if (doneAtStart) router.replace("/");
  }, [doneAtStart, router]);

  useEffect(() => {
    if (!doneAtStart) track("onboarding_step_viewed", { step });
  }, [doneAtStart, step]);

  // Chrome/Android fire this once, early: keep it for the install step.
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function go(next: Step) {
    setError(null);
    setStep(next);
  }

  function skip(from: Step, next: () => void) {
    track("onboarding_step_skipped", { step: from });
    next();
  }

  function installPlatform(): InstallPlatform | null {
    if (isStandalone()) return null;
    if (isIosSafari()) return "ios";
    return installEvent ? "prompt" : null;
  }

  function finish() {
    router.replace("/");
  }

  function afterPush() {
    if (installPlatform()) go("install");
    else finish();
  }

  async function complete(withExpense: boolean) {
    setBusy(true);
    try {
      setUser(await completeOnboarding());
      track("onboarding_completed", { firstExpense: withExpense });
    } catch (err) {
      toastError(err);
      return;
    } finally {
      setBusy(false);
    }
    if (!withExpense) finish();
    else if (canAskPush()) go("push");
    else afterPush();
  }

  async function saveName() {
    const trimmed = firstName.trim();
    if (!user || trimmed === user.firstName) return go("pay");
    setBusy(true);
    setError(null);
    try {
      setUser(await patchMe({ firstName: trimmed }));
      go("pay");
    } catch (err) {
      setError(message(err, "No pudimos guardar tu nombre"));
    } finally {
      setBusy(false);
    }
  }

  async function savePaymentMethods() {
    setBusy(true);
    try {
      for (const input of otherMethodInputs(selected)) {
        if (!findByName(paymentMethods, input.name)) await createPaymentMethod(input);
      }
      refreshPaymentData();
      track("onboarding_payment_methods_saved", { options: [...selected].join(",") });
      const next = cardDrafts(selected, hasMpCard);
      setDrafts(next);
      go(next.length > 0 ? "cards" : "expense");
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  async function saveCards() {
    setBusy(true);
    setError(null);
    const today = isoToday();
    try {
      const known = [...(banks ?? [])];
      for (const d of drafts) {
        const name = names[d.key] ?? "";
        const input = cardInput(d, "", name, today);
        if (findByName(paymentMethods, input.name)) continue; // saved on an earlier try
        let bank = findByName(known, d.bank);
        if (!bank) {
          bank = await createBank(d.bank.trim());
          known.push(bank);
        }
        await createPaymentMethod({ ...input, bankId: bank.id });
      }
      refreshPaymentData();
      go("expense");
    } catch (err) {
      refreshPaymentData();
      setError(message(err, "No pudimos guardar las tarjetas"));
    } finally {
      setBusy(false);
    }
  }

  async function turnOnPush() {
    if (!accessToken) return afterPush();
    setBusy(true);
    try {
      track("onboarding_push", { enabled: await enablePush(accessToken) });
    } catch {
      track("onboarding_push", { enabled: false });
    } finally {
      setBusy(false);
    }
    afterPush();
  }

  async function install() {
    if (!installEvent) return finish();
    setBusy(true);
    try {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      track("onboarding_install", { outcome });
    } finally {
      setBusy(false);
      setInstallEvent(null);
    }
    finish();
  }

  if (doneAtStart) return null;

  switch (step) {
    case "name":
      return (
        <NameStep
          firstName={firstName}
          onChange={setFirstName}
          busy={busy}
          error={error}
          onContinue={saveName}
          onSkip={() => skip("name", () => go("pay"))}
        />
      );
    case "pay":
      return (
        <PayStep
          firstName={user?.firstName ?? ""}
          selected={selected}
          onToggle={(option, on) => {
            const next = new Set(selected);
            if (on) next.add(option);
            else next.delete(option);
            setSelected(next);
          }}
          hasMercadoPagoCard={hasMpCard}
          onMercadoPagoCardChange={setHasMpCard}
          busy={busy}
          onContinue={savePaymentMethods}
          onSkip={() => skip("pay", () => go("expense"))}
        />
      );
    case "cards":
      return (
        <CardsStep
          drafts={drafts}
          names={names}
          bankChoices={bankOptions((banks ?? []).filter((b) => b.isActive).map((b) => b.name))}
          onChange={(key, patch) => setDrafts(drafts.map((d) => (d.key === key ? { ...d, ...patch } : d)))}
          onNameChange={(key, name) => setNames({ ...names, [key]: name })}
          busy={busy}
          error={error}
          onContinue={saveCards}
          onSkip={() => skip("cards", () => go("expense"))}
        />
      );
    case "expense":
      return (
        <ExpenseStep
          onCreated={() => {
            track("onboarding_first_expense");
            void complete(true);
          }}
          onSkip={() => skip("expense", () => void complete(false))}
        />
      );
    case "push":
      return <PushStep busy={busy} onEnable={turnOnPush} onSkip={() => skip("push", afterPush)} />;
    case "install": {
      const platform = installPlatform() ?? "ios";
      return <InstallStep platform={platform} busy={busy} onInstall={install} onDone={finish} />;
    }
  }
}
