"use client";

import { endOfMonth, format, startOfMonth } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerWithRangeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  onDateFilterChange: (from?: Date, to?: Date) => void;
  from?: Date;
  to?: Date;
}

export type DateFilter = [Date | undefined, Date | undefined];

export function DatePickerWithRange({
  from,
  to,
  onDateFilterChange,
  className,
}: DatePickerWithRangeProps) {
  const date = from || to ? { from, to } : undefined;

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[230px] justify-start text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Filter Dates</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="h-full w-full p-0" align="start">
          <Tabs defaultValue="months" className="w-full">
            <TabsList>
              <TabsTrigger value="months">Months</TabsTrigger>
              <TabsTrigger value="range">Range</TabsTrigger>
            </TabsList>
            <TabsContent value="months">
              <div className="flex h-[300px] flex-col items-center  overflow-y-scroll">
                {Array.from({ length: 24 }).map((_, i) => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - i);
                  const startDay = startOfMonth(date);
                  const endDay = endOfMonth(date);

                  return (
                    <div
                      key={i}
                      className="cursor-pointer p-2 hover:bg-primary-foreground hover:text-white"
                      onClick={() => {
                        onDateFilterChange(startDay, endDay);
                      }}
                    >
                      {format(startDay, "LLL y")}
                    </div>
                  );
                })}
              </div>
            </TabsContent>
            <TabsContent value="range">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={(value) => {
                  onDateFilterChange(value?.from, value?.to);
                }}
                numberOfMonths={2}
              />
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
}

import { Row } from "@tanstack/react-table";

// https://github.com/TanStack/table/discussions/4284
export const isWithinRange = (
  row: Row<any>,
  columnId: string,
  value: DateFilter | undefined | null,
) => {
  const date = row.getValue<Date>(columnId);
  if (!value) return true;
  const [start, end] = value;
  //If one filter defined and date is null filter it
  if ((start || end) && !date) return false;
  if (start && !end) {
    return date.getTime() >= start.getTime();
  } else if (!start && end) {
    return date.getTime() <= end.getTime();
  } else if (start && end) {
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
  } else return true;
};
