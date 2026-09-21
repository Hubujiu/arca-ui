/** Shared accessibility and appearance boundary; business code uses this adapter. */
import * as Primitive from "@radix-ui/react-progress";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { cn } from "@/lib/utils";
export * from "@radix-ui/react-progress";
export const Root = forwardRef<ComponentRef<typeof Primitive.Root>, ComponentPropsWithoutRef<typeof Primitive.Root>>(function Root({className, ...props}, ref) { return <Primitive.Root {...props} ref={ref} className={cn("relative h-2 overflow-hidden rounded-full bg-muted", className)} />; });
export const Indicator = forwardRef<ComponentRef<typeof Primitive.Indicator>, ComponentPropsWithoutRef<typeof Primitive.Indicator>>(function Indicator({className, ...props}, ref) { return <Primitive.Indicator {...props} ref={ref} className={cn("h-full rounded-full bg-primary", className)} />; });
