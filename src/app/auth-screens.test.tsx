import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./(auth)/login/page";
import ForgotPasswordPage from "./(auth)/forgot-password/page";
import ResetPasswordPage from "./(auth)/reset-password/page";
import InvitePage from "./invite/accept/page";
import VerifyPendingPage from "./verify-email/pending/page";
import { login } from "@/lib/api/auth";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { API, server, signIn, signOut } from "@/test/msw";
import { useAuthStore } from "@/stores/auth";

// Auth screens on the result card (plan 1.10b, no design).

const replace = vi.fn();
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => search,
}));
vi.mock("@/components/auth/google-button", () => ({ GoogleSignInButton: () => null }));
vi.mock("@/components/dev-signature", () => ({ DevSignature: () => null }));
vi.mock("@/lib/api/auth", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/auth")>()),
  login: vi.fn(),
  forgotPassword: vi.fn().mockResolvedValue(undefined),
}));

const session = {
  accessToken: "tk",
  accessExpiresAt: "2099-01-01T00:00:00Z",
  user: { id: "u1", email: "ana@example.test", firstName: "Ana", lastName: "T", isSuperadmin: false, emailVerifiedAt: "2026-01-01" },
};

beforeEach(() => {
  signOut();
  replace.mockClear();
  vi.mocked(login).mockReset();
  search = new URLSearchParams();
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/login");
});

describe("login", () => {
  it("hydrates without a mismatch and then fills the remembered email", async () => {
    localStorage.setItem(STORAGE_KEYS.rememberedEmail, "ana@example.test");
    const container = document.createElement("div");
    // The server cannot read localStorage: what it renders has no email.
    container.innerHTML = renderToString(<LoginPage />);
    expect(container.querySelector<HTMLInputElement>("#email")?.value).toBe("");
    document.body.appendChild(container);
    const onRecoverableError = vi.fn();
    await act(async () => {
      hydrateRoot(container, <LoginPage />, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    await waitFor(() => expect(container.querySelector<HTMLInputElement>("#email")?.value).toBe("ana@example.test"));
    expect(container.querySelector('[role="checkbox"]')?.getAttribute("aria-checked")).toBe("true");
    container.remove();
  });

  it("goes back to where it was sent from, never off the app", async () => {
    vi.mocked(login).mockResolvedValue(session as never);
    window.history.replaceState(null, "", "/login?next=%2Finvite%2Faccept%3Ftoken%3Dabc");
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "ana@example.test");
    await userEvent.type(screen.getByLabelText("Contraseña"), "Secret-pass-123");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/invite/accept?token=abc"));

    replace.mockClear();
    window.history.replaceState(null, "", "/login?next=https%3A%2F%2Fevil.com");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("shows a server error as an alert", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    vi.mocked(login).mockRejectedValue(new ApiError({ status: 401, code: "unauthorized", message: "email o contraseña incorrectos" }));
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "ana@example.test");
    await userEvent.type(screen.getByLabelText("Contraseña"), "Secret-pass-123");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("email o contraseña incorrectos");
  });
});

describe("forgot password", () => {
  it("ends on the result card with the email", async () => {
    render(<ForgotPasswordPage />);
    await userEvent.type(screen.getByLabelText("Email"), "ana@example.test");
    await userEvent.click(screen.getByRole("button", { name: "Enviar link" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Te enviamos un mail" })).toBeInTheDocument();
    expect(screen.getByText("ana@example.test")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a iniciar sesión" })).toHaveAttribute("href", "/login");
  });
});

describe("reset password", () => {
  it("explains a link without token and offers a new one", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Este link no sirve" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pedir otro link" })).toHaveAttribute("href", "/forgot-password");
  });
});

describe("verify email pending", () => {
  it("shows the email it was sent to", () => {
    sessionStorage.setItem("pending_verify_email", "ana@example.test");
    signIn();
    render(<VerifyPendingPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Verificá tu email" })).toBeInTheDocument();
    expect(screen.getByText("ana@example.test")).toBeInTheDocument();
  });
});

describe("invite", () => {
  it("lets a signed-out guest sign in and come back to the invite", async () => {
    search = new URLSearchParams("token=abc");
    useAuthStore.setState({ hydrated: true });
    server.use(
      http.get(`${API}/invites/abc`, () =>
        HttpResponse.json({ householdId: "h1", householdName: "Casa", email: "ana@example.test", status: "pending" }),
      ),
    );
    render(<InvitePage />);
    expect(await screen.findByRole("heading", { level: 1, name: "Te invitaron a Casa" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ya tengo cuenta" })).toHaveAttribute(
      "href",
      "/login?next=%2Finvite%2Faccept%3Ftoken%3Dabc",
    );
    expect(screen.getByRole("link", { name: "Crear cuenta y unirme" })).toHaveAttribute(
      "href",
      "/register?inviteToken=abc&email=ana%40example.test",
    );
  });

  it("says when the invite was already used", async () => {
    search = new URLSearchParams("token=abc");
    server.use(
      http.get(`${API}/invites/abc`, () =>
        HttpResponse.json({ householdId: "h1", householdName: "Casa", email: "ana@example.test", status: "accepted" }),
      ),
    );
    render(<InvitePage />);
    expect(await screen.findByRole("heading", { level: 1, name: "Invitación no disponible" })).toBeInTheDocument();
    expect(screen.getByText("Esta invitación ya se usó.")).toBeInTheDocument();
  });
});
