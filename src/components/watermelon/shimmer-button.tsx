import { cn } from "@/lib/utils";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function ShimmerButton({ children, className, ...props }: ShimmerButtonProps) {
  return (
    <button
      className={cn(
        "relative h-9 overflow-hidden rounded-full px-3.5 text-sm font-medium",
        "bg-primary text-primary-foreground",
        "transition-shadow duration-300 hover:shadow-sm",
        "group",
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <div
        className={cn(
          "absolute inset-0 -translate-x-full",
          "bg-linear-to-r from-transparent via-white/20 to-transparent",
          "transition-transform duration-700 group-hover:translate-x-full"
        )}
      />
    </button>
  );
}
