import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface FilterOption<T> {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface FilterButtonGroupProps<T> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function FilterButtonGroup<T extends string>({
  options,
  value,
  onChange,
  className,
}: FilterButtonGroupProps<T>) {
  return (
    <div className={cn("flex", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          className={cn(
            "flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium transition-all duration-150 md:gap-2 md:px-4 md:py-2 md:text-sm",
            value === option.value
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
          onClick={() => onChange(option.value)}
        >
          {option.icon && <option.icon className="hidden h-4 w-4 md:inline" />}
          <span>{option.label}</span>
          {option.count !== undefined && (
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-xs font-normal md:ml-2 md:px-2",
                value === option.value
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
