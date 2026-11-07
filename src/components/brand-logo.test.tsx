import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "./brand-logo";

describe("BrandLogo", () => {
  it("shows the brand kit wordmark with a fixed width", () => {
    render(<BrandLogo variant="wordmark" size={40} />);
    const img = screen.getByRole("img", { name: "Valuo" });
    expect(img.getAttribute("src")).toContain("/brand/logo/valuo-wordmark-light.svg");
    // The brand SVGs carry only a viewBox: with width:auto they collapse to 0.
    expect(img.getAttribute("width")).toBe("143");
    expect(img.className).not.toMatch(/\bw-auto\b/);
  });

  it("uses the mark for the icon variant", () => {
    render(<BrandLogo variant="icon" size={28} />);
    expect(screen.getByRole("img", { name: "Valuo" }).getAttribute("src")).toContain("/brand/logo/valuo-mark-light.svg");
  });
});
