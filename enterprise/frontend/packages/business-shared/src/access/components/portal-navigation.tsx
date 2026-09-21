import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "../shared/icons";
import { Button } from "./portal-controls";

export function NavigationDrawer({ open, onOpenChange, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <Button mobileOnly aria-label="打开导航" icon={<Menu />} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <Dialog.Content className="drawer-content">
          <Dialog.Title>工作台导航</Dialog.Title>
          <Dialog.Description className="sr-only">选择要查看的功能</Dialog.Description>
          <Dialog.Close asChild>
            <Button aria-label="关闭导航" icon={<X />} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
