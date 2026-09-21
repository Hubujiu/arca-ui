'use client';

import * as React from 'react';
import { Copy, DotsThreeVertical, Heart, PencilSimple, ShareNetwork, Trash } from '@phosphor-icons/react';
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  type Transition,
  type Variants,
} from 'motion/react';

export interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
}

export interface InlineDisclosureMenuProps {
  menuItems?: MenuItemProps[];
  showDelete?: boolean;
  onDelete?: () => void;
}

const spring: Transition = {
  type: 'spring',
  bounce: 0,
  duration: 0.4,
};

const menuVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: spring },
};

const deleteVariants: Variants = {
  initial: (confirm: boolean) => ({
    y: confirm ? 60 : -60,
  }),
  animate: {
    y: 0,
    transition: spring,
  },
  exit: (confirm: boolean) => ({
    y: confirm ? -60 : 60,
    transition: spring,
  }),
};

const confirmVariants: Variants = {
  initial: (confirm: boolean) => ({
    y: confirm ? 60 : -60,
  }),
  animate: {
    y: 0,
    transition: spring,
  },
  exit: (confirm: boolean) => ({
    y: confirm ? -60 : 60,
    transition: spring,
  }),
};

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  onClick,
  className = '',
}) => (
  <button
    onClick={onClick}
    className={`flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-foreground transition-colors hover:bg-muted ${className}`}
  >
    <span className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground">
      {icon}
    </span>
    <span className="tracking-tight">{label}</span>
  </button>
);

export function InlineDisclosureMenu({
  menuItems = [
    {
      icon: <PencilSimple />,
      label: 'Edit',
    },
    { icon: <Copy />, label: 'Duplicate' },
    {
      icon: <Heart />,
      label: 'Favourite',
    },
    { icon: <ShareNetwork />, label: 'Share' },
  ],
  showDelete = true,
  onDelete,
}: InlineDisclosureMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirm(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative flex w-full justify-center">
      <div ref={ref} className="relative">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
        >
          <DotsThreeVertical size={16} />
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              variants={menuVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="absolute top-1/2 left-1/2 z-50 w-56 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            >
              <div className="border-b border-border bg-muted/40 px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">
                  More Options
                </span>
              </div>

              <LayoutGroup>
                <div className="flex flex-col gap-0.5 px-1.5 py-1.5">
                  {menuItems.map((item, i) => (
                    <MenuItem key={i} {...item} />
                  ))}
                </div>

                {showDelete && (
                  <div className="relative h-11 overflow-hidden border-t border-border">
                    <AnimatePresence
                      custom={confirm}
                      mode="popLayout"
                      initial={false}
                    >
                      {!confirm ? (
                        <motion.div
                          key="delete"
                          custom={confirm}
                          variants={deleteVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          className="absolute inset-0 flex items-center px-1.5"
                        >
                          <MenuItem
                            icon={<Trash className="text-red-500" />}
                            label="Delete"
                            className="cursor-pointer text-red-500 hover:bg-red-500/10"
                            onClick={() => setConfirm(true)}
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="confirm"
                          custom={confirm}
                          variants={confirmVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          className="absolute inset-0 flex items-center gap-1.5 px-1.5"
                        >
                          <button
                            onClick={onDelete}
                            className="h-8 flex-1 cursor-pointer rounded-lg bg-red-500 text-sm font-medium text-white"
                          >
                            Yes, Delete
                          </button>

                          <button
                            onClick={() => setConfirm(false)}
                            className="h-8 flex-1 cursor-pointer rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </LayoutGroup>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
