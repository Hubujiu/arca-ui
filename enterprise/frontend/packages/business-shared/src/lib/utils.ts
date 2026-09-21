import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Keep custom design tokens in their real utility groups. Without this, unknown
// text-* sizes are treated as colours and can erase a button's foreground.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["caption", "body", "title", "heading"],
      radius: ["control", "card", "panel"],
      shadow: ["tactile"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
