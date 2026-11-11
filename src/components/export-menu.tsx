"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ExportRange } from "@/lib/api/mutations";
import { saveFile } from "@/lib/download";
import { fmtMonthLong, monthEnd, monthStart } from "@/lib/format";
import { toastError } from "@/lib/toast";

/**
 * "Descargar en Excel" (plan 11.1): the month on screen, with its filters,
 * or the whole year of that month. The file is named like the API names it.
 */
export function ExportMenu({
  prefix,
  month,
  filtered = false,
  download,
}: {
  /** File name prefix: "gastos" or "ingresos". */
  prefix: string;
  /** The month on screen, YYYY-MM. */
  month: string;
  /** Filters are on: the month option says so, the year one drops them. */
  filtered?: boolean;
  /** Fetches the file; `withFilters` is false for the whole year. */
  download: (range: ExportRange, withFilters: boolean) => Promise<Blob>;
}) {
  const [busy, setBusy] = useState(false);
  const year = month.slice(0, 4);

  async function run(range: ExportRange, withFilters: boolean, filename: string) {
    setBusy(true);
    try {
      saveFile(await download(range, withFilters), filename);
      toast.success("Listo, se descargó el Excel");
    } catch (e) {
      toastError(e, "No se pudo descargar el Excel");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="secondary" size="icon" aria-label="Descargar en Excel" disabled={busy} aria-busy={busy} />}
      >
        {busy ? <Loader2 aria-hidden className="animate-spin" strokeWidth={1.75} /> : <Download aria-hidden strokeWidth={1.75} />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Descargar en Excel</DropdownMenuLabel>
          <DropdownMenuItem
            className="min-h-11 text-body"
            onClick={() => void run({ from: monthStart(month), to: monthEnd(month) }, true, `${prefix}-${month}.xlsx`)}
          >
            {fmtMonthLong(month)}
            {filtered ? ", con los filtros" : ""}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-11 text-body"
            onClick={() => void run({ from: `${year}-01-01`, to: `${year}-12-31` }, false, `${prefix}-${year}.xlsx`)}
          >
            Todo {year}
            {filtered ? " (sin filtros)" : ""}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
