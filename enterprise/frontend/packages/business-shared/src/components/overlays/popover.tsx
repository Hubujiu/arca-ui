/** Shared accessibility and appearance boundary; business code uses this adapter. */
import * as Primitive from "@radix-ui/react-popover";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { cn } from "@/lib/utils";
export * from "@radix-ui/react-popover";
export const Content = forwardRef<ComponentRef<typeof Primitive.Content>, ComponentPropsWithoutRef<typeof Primitive.Content>>(function Content({className, ...props}, ref) { return <Primitive.Content {...props} ref={ref} className={cn("rounded-panel border border-border bg-card p-4 text-foreground shadow-tactile", className)} />; });
