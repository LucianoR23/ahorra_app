import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { SpaceTabs } from "./space-tabs";
import { API, server, signIn } from "@/test/msw";
import { hogarSpace, personalSpace, WithSWR } from "@/test/spaces";
import { useHouseholdStore } from "@/stores/household";

beforeEach(() => signIn({ householdId: personalSpace.id }));

describe("SpaceTabs (Yo · Hogar)", () => {
  it("is hidden for users without a hogar", async () => {
    server.use(http.get(`${API}/households`, () => HttpResponse.json([personalSpace])));
    const { container } = render(<SpaceTabs />, { wrapper: WithSWR });
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("switches between Mi plata and the hogar", async () => {
    server.use(
      http.get(`${API}/households`, () => HttpResponse.json([personalSpace, hogarSpace])),
      http.get(`${API}/*`, () => HttpResponse.json([])),
    );
    render(<SpaceTabs />, { wrapper: WithSWR });
    const yo = await screen.findByRole("tab", { name: "Yo" });
    expect(yo).toHaveAttribute("aria-selected", "true");

    await userEvent.click(screen.getByRole("tab", { name: "Hogar" }));
    expect(useHouseholdStore.getState().currentId).toBe(hogarSpace.id);
    await waitFor(() => expect(screen.getByRole("tab", { name: "Hogar" })).toHaveAttribute("aria-selected", "true"));
  });
});
