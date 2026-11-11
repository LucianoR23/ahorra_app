import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API, requests, resetRequests, server, signIn } from "@/test/msw";
import { AdminWaitlist } from "./admin-waitlist";

// Waitlist section of the superadmin area (plan 1.11).

const confirmMock = vi.fn(async () => true);
vi.mock("@/lib/confirm", () => ({ confirm: () => confirmMock() }));
const saveFile = vi.fn();
vi.mock("@/lib/download", () => ({ saveFile: (...a: unknown[]) => saveFile(...a) }));

beforeEach(() => {
  resetRequests();
  signIn();
  confirmMock.mockClear();
  saveFile.mockClear();
});

describe("AdminWaitlist", () => {
  it("downloads the confirmed entries as CSV", async () => {
    server.use(
      http.get(`${API}/admin/waitlist.csv`, () =>
        new HttpResponse("email\na@example.test\n", { headers: { "Content-Type": "text/csv" } }),
      ),
    );
    render(<AdminWaitlist />);
    await userEvent.click(screen.getByRole("button", { name: "Descargar CSV" }));
    await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1));
    expect(saveFile.mock.calls[0][1]).toMatch(/^lista-de-espera-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("erases an address only after a valid email and a confirmation", async () => {
    server.use(http.delete(`${API}/admin/waitlist`, () => new HttpResponse(null, { status: 204 })));
    render(<AdminWaitlist />);
    const button = screen.getByRole("button", { name: "Borrar de la lista" });
    const input = screen.getByLabelText("Email");
    await userEvent.type(input, "no-es-un-email");
    expect(button).toBeDisabled();

    await userEvent.clear(input);
    await userEvent.type(input, " ana@example.test ");
    await userEvent.click(button);
    await waitFor(() =>
      expect(requests().some((r) => r.method === "DELETE" && r.query?.email === "ana@example.test")).toBe(true),
    );
    expect(confirmMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("does nothing when the confirmation is cancelled", async () => {
    confirmMock.mockResolvedValueOnce(false);
    render(<AdminWaitlist />);
    await userEvent.type(screen.getByLabelText("Email"), "ana@example.test");
    await userEvent.click(screen.getByRole("button", { name: "Borrar de la lista" }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(requests().some((r) => r.path === "/admin/waitlist")).toBe(false);
  });
});
