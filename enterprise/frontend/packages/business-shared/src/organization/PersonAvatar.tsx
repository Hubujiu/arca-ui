import { cn } from "@/lib/utils";
import type { Person } from "./model";

const TONES = [
  "bg-status-info/10 text-status-info dark:bg-status-info/80 dark:text-status-info",
  "bg-violet-100 text-violet-800 dark:bg-violet-900/80 dark:text-violet-100",
  "bg-teal-100 text-teal-800 dark:bg-teal-900/80 dark:text-teal-100",
  "bg-status-warning/10 text-status-warning dark:bg-status-warning/80 dark:text-status-warning",
  "bg-destructive/10 text-destructive dark:bg-destructive/80 dark:text-destructive",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-100",
];

function initial(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 1) : "?";
}

function tone(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return TONES[Math.abs(hash) % TONES.length];
}

export function PersonAvatar({
  person,
  size = "md",
  className,
}: {
  person: Pick<Person, "id" | "displayName">;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium",
        size === "sm" ? "size-6 text-caption" : "size-8 text-caption",
        tone(person.id),
        className,
      )}
    >
      {initial(person.displayName)}
    </span>
  );
}
