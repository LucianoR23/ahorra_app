import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const reportError = vi.hoisted(() => vi.fn());
vi.mock("@/lib/report-error", () => ({ reportError }));

import ErrorPage from "./error";
import NotFound from "./not-found";
import OfflinePage from "./offline/page";

describe("error.tsx", () => {
  it("reports the error, shows nothing of it and retries", async () => {
    const err = new Error("monto 1234 de ana@example.com");
    const retry = vi.fn();
    render(<ErrorPage error={err} retry={retry} />);
    expect(reportError).toHaveBeenCalledWith(err);
    expect(screen.getByRole("heading", { name: "Algo salió mal" })).toBeInTheDocument();
    expect(screen.queryByText(/ana@example.com/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/");
  });
});

describe("not-found.tsx", () => {
  it("links home", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: "No encontramos esta página" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/");
  });
});

describe("offline page", () => {
  it("reloads the page that failed", async () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    render(<OfflinePage />);
    expect(screen.getByRole("heading", { name: "Sin conexión" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(reload).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
