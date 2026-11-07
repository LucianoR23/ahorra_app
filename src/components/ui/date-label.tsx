import { dayLabel } from "@/lib/format"

/** "Hoy", "Ayer", "Lun 2", "3/12" with the full date for machines. */
function DateLabel({ date, today, className }: { date: string; today?: string; className?: string }) {
  return (
    <time data-slot="date-label" dateTime={date.slice(0, 10)} className={className}>
      {dayLabel(date, today)}
    </time>
  )
}

export { DateLabel }
