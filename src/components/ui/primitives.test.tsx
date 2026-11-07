import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inbox } from "lucide-react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Alert } from "./alert";
import { Checkbox } from "./checkbox";
import { DateLabel } from "./date-label";
import { EmptyState } from "./empty-state";
import { InstallmentBar, ListRow } from "./list-row";
import { Money } from "./money";
import { MonthNavigator } from "./month-navigator";
import { PageHeader } from "./page-header";
import { ResultCard } from "./result-card";
import { Segmented } from "./segmented";

describe("Money", () => {
  it("formats with tabular figures and colors incomes", () => {
    render(
      <>
        <Money amount={2500} />
        <Money amount={1151143} income />
      </>,
    );
    expect(screen.getByText("$ 2.500")).toHaveClass("tabular-nums");
    expect(screen.getByText("+ $ 1.151.143")).toHaveClass("text-positive");
  });
});

describe("DateLabel", () => {
  it("shows the short day and keeps the date for machines", () => {
    render(<DateLabel date="2026-11-06" today="2026-11-07" />);
    expect(screen.getByText("Ayer")).toHaveAttribute("datetime", "2026-11-06");
  });
});

describe("Checkbox", () => {
  it("toggles with its label", async () => {
    const onChange = vi.fn();
    render(
      <label>
        <Checkbox onCheckedChange={onChange} /> Recordar mi email
      </label>,
    );
    const box = screen.getByRole("checkbox", { name: "Recordar mi email" });
    await userEvent.click(screen.getByText("Recordar mi email"));
    expect(onChange).toHaveBeenCalledWith(true, expect.anything());
    expect(box).toHaveAttribute("aria-checked", "true");
  });
});

describe("Alert", () => {
  it("announces errors at once and warnings politely", () => {
    render(
      <>
        <Alert variant="error">No pudimos guardar.</Alert>
        <Alert>Vas por el 85% de Delivery.</Alert>
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos guardar.");
    expect(screen.getByRole("status")).toHaveTextContent("Vas por el 85% de Delivery.");
  });
});

describe("EmptyState and ResultCard", () => {
  it("render title, hint and one action", () => {
    render(
      <>
        <EmptyState
          icon={Inbox}
          title="Todavía no cargaste nada este mes"
          description="Probá con café 2500"
          action={<button type="button">Cargar gasto</button>}
        />
        <ResultCard title="Te enviamos un mail" description="Revisá tu bandeja." />
      </>,
    );
    expect(screen.getByText("Todavía no cargaste nada este mes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cargar gasto" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Te enviamos un mail" })).toBeInTheDocument();
  });
});

describe("PageHeader", () => {
  it("is the page heading, with an optional back link", () => {
    render(<PageHeader title="Con volver" back={{ href: "/mas" }} action={<button type="button">Ayuda</button>} />);
    expect(screen.getByRole("heading", { level: 1, name: "Con volver" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver" })).toHaveAttribute("href", "/mas");
  });
});

describe("MonthNavigator", () => {
  function Harness({ start, max }: { start: string; max?: string }) {
    const [month, setMonth] = useState(start);
    return <MonthNavigator month={month} onMonthChange={setMonth} max={max} summary="Total $ 486.320" />;
  }

  it("moves between months and stops at max", async () => {
    render(<Harness start="2026-11" max="2026-11" />);
    expect(screen.getByText("Noviembre 2026")).toBeInTheDocument();
    expect(screen.getByText("Total $ 486.320")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(screen.getByText("Octubre 2026")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByText("Noviembre 2026")).toBeInTheDocument();
  });

  it("crosses years", async () => {
    render(<Harness start="2026-01" />);
    await userEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(screen.getByText("Diciembre 2025")).toBeInTheDocument();
  });
});

describe("ListRow and InstallmentBar", () => {
  it("links the whole row and reads installments as text", () => {
    render(
      <ListRow
        href="/movimientos/e1"
        title="Heladera"
        subtitle={<InstallmentBar current={3} total={12} />}
        trailing={<Money amount={89990} />}
      />,
    );
    const row = screen.getByRole("link");
    expect(row).toHaveAttribute("href", "/movimientos/e1");
    expect(row).toHaveTextContent("Heladera3 de 12$ 89.990");
  });

  it("draws one pill per installment, capped at 12", () => {
    const filledOf = (c: HTMLElement) => [...c.querySelectorAll("[aria-hidden] > span")];
    const { container, rerender } = render(<InstallmentBar current={3} total={12} />);
    expect(filledOf(container)).toHaveLength(12);
    expect(filledOf(container).filter((p) => p.classList.contains("bg-brand"))).toHaveLength(3);

    rerender(<InstallmentBar current={12} total={24} />);
    expect(filledOf(container)).toHaveLength(12);
    expect(filledOf(container).filter((p) => p.classList.contains("bg-brand"))).toHaveLength(6);
  });
});

describe("Segmented", () => {
  it("is a radio group that always has one choice", async () => {
    function Harness() {
      const [v, setV] = useState<"a" | "b">("a");
      return (
        <Segmented
          aria-label="Tipo"
          value={v}
          onValueChange={setV}
          options={[
            { value: "a", label: "Gastos fijos" },
            { value: "b", label: "Ingresos fijos" },
          ]}
        />
      );
    }
    render(<Harness />);
    await userEvent.click(screen.getByRole("radio", { name: "Ingresos fijos" }));
    expect(screen.getByRole("radio", { name: "Ingresos fijos" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Gastos fijos" })).toHaveAttribute("aria-checked", "false");
  });
});
