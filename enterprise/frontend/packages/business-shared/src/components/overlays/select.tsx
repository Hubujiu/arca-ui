/** Shared accessibility and appearance boundary; business code uses this adapter. */
import * as Primitive from "@radix-ui/react-select";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { cn } from "@/lib/utils";
export * from "@radix-ui/react-select";
export const Content = forwardRef<ComponentRef<typeof Primitive.Content>, ComponentPropsWithoutRef<typeof Primitive.Content>>(function Content({className, ...props}, ref) { return <Primitive.Content {...props} ref={ref} className={cn("rounded-panel border border-border bg-card p-2 text-foreground shadow-tactile", className)} />; });
export const Item = forwardRef<ComponentRef<typeof Primitive.Item>, ComponentPropsWithoutRef<typeof Primitive.Item>>(function Item({className, ...props}, ref) { return <Primitive.Item {...props} ref={ref} className={cn("flex cursor-default items-center gap-2 rounded-control px-3 py-2 text-body outline-none focus:bg-muted data-disabled:opacity-50", className)} />; });
