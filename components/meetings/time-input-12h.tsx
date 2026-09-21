"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);

function to12Hour(value24: string): { hour12: number; minute: number; meridiem: "AM" | "PM" } {
  const [hStr, mStr] = (value24 || "00:00").split(":");
  const h24 = Number.parseInt(hStr, 10) || 0;
  const minute = Number.parseInt(mStr, 10) || 0;
  const meridiem: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour12, minute, meridiem };
}

function to24Hour(hour12: number, minute: number, meridiem: "AM" | "PM"): string {
  const h24 = meridiem === "PM" ? (hour12 % 12) + 12 : hour12 % 12;
  return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

interface TimeInput12hProps {
  id?: string;
  /** 24-hour "HH:mm" — this is still what's stored/compared (see meeting.schema.ts); only the input controls are 12-hour. */
  value: string;
  onChange: (value24: string) => void;
  "aria-label"?: string;
}

/**
 * Three explicit controls (hour 1-12, minute, AM/PM) instead of a native
 * `<input type="time">` — that input's AM/PM-vs-24-hour display depends on
 * the browser/OS locale, which is exactly the ambiguity that caused real
 * users to schedule meetings at the wrong time of day. This is always
 * unambiguous regardless of locale, and still produces the same 24-hour
 * "HH:mm" string the rest of the app already stores and compares.
 */
export function TimeInput12h({ id, value, onChange, ...aria }: TimeInput12hProps) {
  const { hour12, minute, meridiem } = to12Hour(value);

  function update(next: Partial<{ hour12: number; minute: number; meridiem: "AM" | "PM" }>) {
    onChange(to24Hour(next.hour12 ?? hour12, next.minute ?? minute, next.meridiem ?? meridiem));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={aria["aria-label"]}>
      <Select value={String(hour12)} onValueChange={(v) => v && update({ hour12: Number(v) })}>
        <SelectTrigger id={id} className="w-[4.25rem]" aria-label="Hour">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS_12.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {String(h).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm text-muted-foreground" aria-hidden>
        :
      </span>
      <Input
        type="number"
        min={0}
        max={59}
        className="w-16 text-center"
        value={String(minute).padStart(2, "0")}
        onChange={(e) => update({ minute: Math.min(59, Math.max(0, Number.parseInt(e.target.value, 10) || 0)) })}
        aria-label="Minute"
      />
      <Select value={meridiem} onValueChange={(v) => v && update({ meridiem: v as "AM" | "PM" })}>
        <SelectTrigger className="w-[4.5rem]" aria-label="AM or PM">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
