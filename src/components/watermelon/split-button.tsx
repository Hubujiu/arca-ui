'use client';

import { type JSX, useState } from 'react';
import { motion, type Transition } from 'motion/react';
import { ArrowLeft } from '@phosphor-icons/react';

const SPRING: Transition = {
  type: 'spring',
  bounce: 0.55,
  duration: 1,
};

export interface SplitButtonProps {
  mainButton?: string;
  buttons?: string[];
}

export default function SplitButton({
  mainButton = 'New Project',
  buttons = ['iOS', 'macOS', 'tvOS'],
}: SplitButtonProps = {}): JSX.Element {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <div className="relative flex min-h-10 w-full items-center justify-center font-medium">
      {/* MAIN BUTTON */}
      <motion.button
        layout
        transition={SPRING}
        onClick={() => setOpen(true)}
        className="absolute z-10 h-9 rounded-full border border-border bg-card px-3.5 text-sm tracking-tight text-foreground whitespace-nowrap"
        initial={false}
        animate={{
          scaleX: open ? 1.5 : 1,
          scaleY: open ? 0.9 : 1,
          opacity: open ? 0 : 1,
          filter: open ? 'blur(8px)' : 'blur(0px)',
          pointerEvents: open ? 'none' : 'auto',
        }}
        whileHover={{ scale: 1 }}
        whileTap={{ scale: 1.15 }}
      >
        {mainButton}
      </motion.button>

      {/* SPLIT ROW */}
      <motion.div
        layout
        transition={SPRING}
        className="absolute z-0 flex items-center justify-center gap-1.5"
        initial={false}
        animate={{
          scaleX: open ? 1 : 0.2,
          scaleY: open ? 1 : 0.9,
          opacity: open ? 1 : 0,
          filter: open ? 'blur(0px)' : 'blur(8px)',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {/* BACK BUTTON */}
        <motion.button
          onClick={() => setOpen(false)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground"
          whileHover={{ scale: 1 }}
          whileTap={{ scale: 1.15 }}
        >
          <ArrowLeft size={16} />
        </motion.button>

        {buttons.map((name, index) => {
          return (
            <motion.button
              key={index}
              onClick={() => {
                setOpen(false);
              }}
              className="h-9 rounded-full border border-border bg-card px-3.5 text-sm tracking-tight text-foreground"
              whileHover={{ scale: 1 }}
              whileTap={{ scale: 1.05 }}
            >
              {name}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
