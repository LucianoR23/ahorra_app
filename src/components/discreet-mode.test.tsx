import { render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { DiscreetToggle } from "./discreet-toggle";
import { PrivacyCard } from "./privacy-card";
import { Money } from "./ui/money";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { useDiscreetStore, useFormatAmount, useMaskText } from "@/stores/discreet";

// Discreet mode (plan 1.9, design ModoDiscreto).

beforeEach(() => {
  localStorage.clear();
  useDiscreetStore.setState({ hidden: false });
});

describe("Money in discreet mode", () => {
  it("shows a fixed mask with an accessible label and no income color", () => {
    useDiscreetStore.setState({ hidden: true });
    render(
      <>
        <Money amount={2500} />
        <Money amount={1151143} currency="USD" income />
      </>,
    );
    expect(screen.queryByText(/2\.500|1\.151\.143/)).not.toBeInTheDocument();
    const [ars, usd] = screen.getAllByLabelText("Monto oculto");
    expect(ars).toHaveTextContent("$ ••••••");
    expect(usd).toHaveTextContent("US$ ••••••");
    expect(usd).not.toHaveClass("text-positive");
  });

  it("shows the amount when the mode is off", () => {
    render(<Money amount={2500} />);
    expect(screen.getByText("$ 2.500")).not.toHaveAttribute("aria-label");
  });
});

describe("DiscreetToggle", () => {
  it("hides every amount with one tap, says so, and remembers it on this device", async () => {
    render(
      <>
        <DiscreetToggle />
        <Money amount={2500} />
      </>,
    );
    const eye = screen.getByRole("button", { name: "Ocultar montos" });
    expect(eye).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(eye);

    expect(screen.getByRole("button", { name: "Mostrar montos" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Monto oculto")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.discreet) ?? "{}")).toMatchObject({ state: { hidden: true } });

    await userEvent.click(screen.getByRole("button", { name: "Mostrar montos" }));
    expect(screen.getByText("$ 2.500")).toBeInTheDocument();
  });
});

describe("PrivacyCard", () => {
  it("turns discreet mode on and off with a switch", async () => {
    render(<PrivacyCard />);
    const toggle = screen.getByRole("switch", { name: "Modo discreto" });
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    expect(useDiscreetStore.getState().hidden).toBe(true);
    expect(toggle).toBeChecked();
  });
});

describe("string helpers", () => {
  it("format or mask amounts that go inside strings", () => {
    const { result, rerender } = renderHook(() => ({ format: useFormatAmount(), mask: useMaskText() }));
    expect(result.current.format(1500, "ARS")).toBe("$ 1.500");
    expect(result.current.mask("te toca 1500.00 ARS")).toBe("te toca 1500.00 ARS");

    useDiscreetStore.setState({ hidden: true });
    rerender();
    expect(result.current.format(1500, "USD")).toBe("US$ ••••••");
    expect(result.current.mask("te toca 1500.00 ARS")).toBe("te toca $ ••••••");
  });
});
