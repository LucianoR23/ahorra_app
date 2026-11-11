import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExportMenu } from "./export-menu";
import { ApiError } from "@/lib/api/errors";
import { toastError } from "@/lib/toast";

// "Descargar en Excel" (plan 11.1).

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/toast", () => ({ toastError: vi.fn() }));

let saved: { href: string; download: string }[] = [];

beforeEach(() => {
  saved = [];
  vi.mocked(toast.success).mockClear();
  vi.mocked(toastError).mockClear();
  URL.createObjectURL = vi.fn(() => "blob:file");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    saved.push({ href: this.href, download: this.download });
  });
});

afterEach(() => vi.restoreAllMocks());

const file = () => Promise.resolve(new Blob(["PK"]));

describe("ExportMenu", () => {
  it("downloads the month on screen with its filters", async () => {
    const download = vi.fn(file);
    render(<ExportMenu prefix="gastos" month="2026-11" filtered download={download} />);

    await userEvent.click(screen.getByRole("button", { name: "Descargar en Excel" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Noviembre 2026, con los filtros" }));

    expect(download).toHaveBeenCalledWith({ from: "2026-11-01", to: "2026-11-30" }, true);
    await vi.waitFor(() => expect(saved).toEqual([{ href: "blob:file", download: "gastos-2026-11.xlsx" }]));
    expect(toast.success).toHaveBeenCalledWith("Listo, se descargó el Excel");
  });

  it("downloads the whole year without the filters", async () => {
    const download = vi.fn(file);
    render(<ExportMenu prefix="ingresos" month="2028-02" filtered download={download} />);

    await userEvent.click(screen.getByRole("button", { name: "Descargar en Excel" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Todo 2028 (sin filtros)" }));

    expect(download).toHaveBeenCalledWith({ from: "2028-01-01", to: "2028-12-31" }, false);
    await vi.waitFor(() => expect(saved[0]?.download).toBe("ingresos-2028.xlsx"));
  });

  it("names the options plainly without filters", async () => {
    render(<ExportMenu prefix="ingresos" month="2026-03" download={vi.fn(file)} />);
    await userEvent.click(screen.getByRole("button", { name: "Descargar en Excel" }));
    expect(await screen.findByRole("menuitem", { name: "Marzo 2026" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Todo 2026" })).toBeInTheDocument();
  });

  it("shows the error and saves nothing when the download fails", async () => {
    const err = new ApiError({ code: "validation", status: 422, message: "son demasiados movimientos" });
    render(<ExportMenu prefix="gastos" month="2026-11" download={() => Promise.reject(err)} />);

    await userEvent.click(screen.getByRole("button", { name: "Descargar en Excel" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Noviembre 2026" }));

    await vi.waitFor(() => expect(toastError).toHaveBeenCalledWith(err, "No se pudo descargar el Excel"));
    expect(saved).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Descargar en Excel" })).toBeEnabled();
  });
});
