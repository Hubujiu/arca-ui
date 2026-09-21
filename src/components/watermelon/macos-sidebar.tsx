"use client";

import { Plus, Sidebar } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MacOSSidebarProps {
  items: string[];
  defaultOpen?: boolean;
  initialSelectedIndex?: number;
  children?: ReactNode;
  className?: string;
}

export function MacOSSidebar({
  items,
  defaultOpen = true,
  initialSelectedIndex = 0,
  children,
  className = "",
}: MacOSSidebarProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] =
    useState<number>(initialSelectedIndex);
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  return (
    <div
      className={cn(
        "relative flex w-full overflow-hidden rounded-xl border border-border bg-card p-1.5 sm:min-w-[480px]",
        className,
      )}
    >
      <motion.div
        animate={{
          width: isOpen ? 220 : 48,
        }}
        transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
        className={cn(
          "flex shrink-0 flex-col items-start rounded-lg p-1 transition-colors duration-900 ease-out",
          isOpen ? "bg-muted/50" : "bg-transparent",
        )}
      >
        <div
          className={cn(
            "flex h-9 w-full shrink-0 items-center p-1 text-muted-foreground",
            isOpen ? "justify-end gap-1" : "justify-center",
          )}
        >
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Plus className="cursor-pointer" size={16} />
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            layout
            className="flex shrink-0 items-center justify-center"
          >
            <Sidebar
              className="cursor-pointer"
              size={16}
              onClick={() => setIsOpen(!isOpen)}
            />
          </motion.div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative z-10 mt-1 flex w-full flex-col gap-0.5 whitespace-nowrap"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {items.map((item, index) => (
                <div
                  key={item}
                  className="relative cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onClick={() => setSelectedIndex(index)}
                >
                  <AnimatePresence>
                    {selectedIndex === index && (
                      <motion.div
                        className="absolute inset-0 z-0 rounded-lg bg-muted"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                    )}
                  </AnimatePresence>
                  <p
                    className={cn(
                      "relative z-10 h-9 px-2.5 leading-9 tracking-tight",
                      selectedIndex === index
                        ? "font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {item}
                  </p>
                  <AnimatePresence>
                    {hoveredIndex === index && selectedIndex !== index && (
                      <motion.span
                        layoutId="sidebar-hover-bg"
                        className="absolute inset-0 z-0 rounded-lg bg-muted/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 30,
                        }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="z-0 h-full min-h-full w-full flex-1 overflow-y-auto pl-4 lg:pl-6">
        {children}
      </div>
    </div>
  );
}
