"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={ko}
      className={cn("pixel-calendar", className)}
      classNames={{
        months: "flex flex-col",
        month_caption: "flex items-center justify-center py-2",
        caption_label: "text-sm font-bold text-white",
        nav: "flex items-center justify-between absolute top-2.5 left-1.5 right-1.5 z-10",
        button_previous: "pixel-cal-nav",
        button_next: "pixel-cal-nav",
        weekdays: "grid grid-cols-7 mb-1 border-b border-gray-600 pb-2",
        weekday: "text-[11px] font-bold text-gray-500 text-center w-9",
        week: "grid grid-cols-7",
        day: "p-0 text-center",
        day_button: "pixel-cal-day",
        selected: "pixel-cal-selected",
        today: "pixel-cal-today",
        outside: "opacity-30",
        disabled: "opacity-20 cursor-not-allowed",
        ...classNames,
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
