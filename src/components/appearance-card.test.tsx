import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppearanceCard } from "./appearance-card";

function renderCard() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AppearanceCard />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  // jsdom has no matchMedia; next-themes reads it for "system".
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
  localStorage.clear();
  document.documentElement.className = "";
});

afterEach(() => vi.unstubAllGlobals());

describe("AppearanceCard", () => {
  it("follows the device by default", async () => {
    renderCard();
    const group = screen.getByRole("radiogroup", { name: "Apariencia" });
    expect(group).toBeInTheDocument();
    expect(await screen.findByRole("radio", { name: "Sistema" })).toHaveAttribute("aria-checked", "true");
  });

  it("forces a theme and remembers it", async () => {
    renderCard();
    await userEvent.click(screen.getByRole("radio", { name: "Oscuro" }));
    expect(screen.getByRole("radio", { name: "Oscuro" })).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    await userEvent.click(screen.getByRole("radio", { name: "Claro" }));
    expect(document.documentElement).toHaveClass("light");
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
