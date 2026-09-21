import { useEffect, type ReactNode } from "react";
import {
  AnimatedToastStack,
  useAnimatedToastStack,
  type ToastInput,
} from "@/components/motion/animated-toast-stack";

type ToastApi = {
  show: (input: ToastInput) => string;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

let deliver: ((input: ToastInput) => string) | undefined;
const queued: ToastInput[] = [];

function push(input: ToastInput) {
  if (deliver) return deliver(input);
  queued.push(input);
  return "";
}

export const toast: ToastApi = {
  show: push,
  success: (title, description) => {
    push({ title, description, status: "success" });
  },
  error: (title, description) => {
    push({ title, description, status: "error" });
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const stack = useAnimatedToastStack({ defaultDuration: 4200, limit: 5 });

  useEffect(() => {
    deliver = stack.showToast;
    while (queued.length) {
      const next = queued.shift();
      if (next) stack.showToast(next);
    }
    return () => {
      if (deliver === stack.showToast) deliver = undefined;
    };
  }, [stack.showToast]);

  return (
    <>
      {children}
      <AnimatedToastStack
        toasts={stack.toasts}
        onDismiss={stack.dismissToast}
        position="top-right"
        placement="fixed"
      />
    </>
  );
}
