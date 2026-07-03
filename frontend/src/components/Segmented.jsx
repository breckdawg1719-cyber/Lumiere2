import { cn } from "@/lib/utils";

/**
 * Pill-style segmented control. Pure-tailwind, no Radix dependency.
 * options: [{ value, label, color? }]
 */
export default function Segmented({ value, onChange, options, className, testId }) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "inline-flex w-full rounded-full bg-[#EAE5DF]/40 p-1 gap-1",
        className
      )}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            data-testid={testId ? `${testId}-${o.value}` : undefined}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 px-3 py-2 rounded-full text-xs font-medium capitalize transition-all",
              active
                ? "bg-white text-[#2C2C2C] shadow-sm"
                : "text-[#76726B] hover:text-[#2C2C2C]"
            )}
            style={active && o.color ? { color: "#2C2C2C", borderColor: o.color } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
