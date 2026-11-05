import { render, renderHook, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api/errors";
import { confirm, ConfirmDialogHost } from "./confirm";
import { useIsClient } from "./hooks";
import { NAV_ITEMS } from "./nav";
import { captureClientMetadata } from "./support-metadata";
import { toast, toastError } from "./toast";
import { cn } from "./utils";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => vi.mocked(toast.error).mockClear());

describe("toastError", () => {
  it.each([
    [new ApiError({ code: "rate_limited", message: "m", status: 429, retryAfterSeconds: 12 }), "Demasiados intentos", { description: "Reintentá en 12s." }],
    [new ApiError({ code: "rate_limited", message: "m", status: 429 }), "Demasiados intentos", { description: "Esperá unos minutos e intentá de nuevo." }],
    [ApiError.network("sin red"), "Sin conexión", { description: "sin red" }],
    [new ApiError({ code: "unauthorized", message: "vencida", status: 401 }), "Sesión expirada", { description: "vencida" }],
    [new ApiError({ code: "forbidden", message: "no", status: 403 }), "No tenés permisos", { description: "no" }],
    [new ApiError({ code: "internal", message: "boom", status: 500 }), "Error del servidor", { description: "boom" }],
  ])("%s", (err, title, opts) => {
    toastError(err);
    expect(toast.error).toHaveBeenCalledWith(title, opts);
  });

  it("validation errors show their message; unknown errors the fallback", () => {
    toastError(new ApiError({ code: "validation", message: "debe ser > 0", status: 422 }));
    expect(toast.error).toHaveBeenLastCalledWith("debe ser > 0");
    toastError(new Error("x"), "No se pudo guardar");
    expect(toast.error).toHaveBeenLastCalledWith("No se pudo guardar");
    toastError("raro");
    expect(toast.error).toHaveBeenLastCalledWith("Ocurrió un error inesperado");
  });
});

describe("confirm", () => {
  it("resolves true on confirm and false on cancel", async () => {
    render(<ConfirmDialogHost />);
    let answer!: Promise<boolean>;
    act(() => {
      answer = confirm({ title: "¿Borrar gasto?", description: "No se puede deshacer", confirmLabel: "Borrar", destructive: true });
    });
    expect(await screen.findByText("¿Borrar gasto?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Borrar" }));
    await expect(answer).resolves.toBe(true);

    act(() => {
      answer = confirm({ title: "¿Salir?" });
    });
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar" }));
    await expect(answer).resolves.toBe(false);
  });
});

describe("small helpers", () => {
  it("useIsClient is true after hydration", () => {
    expect(renderHook(() => useIsClient()).result.current).toBe(true);
  });

  it("cn merges Tailwind classes", () => {
    expect(cn("p-2", false && "hidden", "p-4")).toBe("p-4");
  });

  it("navigation has unique ids and only Superadmin is admin-only", () => {
    expect(new Set(NAV_ITEMS.map((i) => i.id)).size).toBe(NAV_ITEMS.length);
    expect(NAV_ITEMS.filter((i) => i.adminOnly).map((i) => i.href)).toEqual(["/admin"]);
  });

  it("support metadata describes the browser", () => {
    const m = captureClientMetadata();
    expect(m).toMatchObject({ url: window.location.href, locale: navigator.language });
    expect(m.viewport).toMatch(/^\d+x\d+$/);
    expect(Date.parse(m.client_ts ?? "")).not.toBeNaN();
  });
});
