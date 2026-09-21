'use client';

import { useState, useRef, type FC } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface MenuItem {
  id: string;
  label: string;
  children?: MenuItem[];
}

interface TreeMenuProps {
  menuData?: MenuItem[];
  onSelect?: (item: MenuItem) => void;
}

export const TreeMenu: FC<TreeMenuProps> = ({ menuData = [], onSelect }) => {
  const [path, setPath] = useState<MenuItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const clickedIndexRef = useRef<number | null>(null);

  const currentItems =
    path.length === 0 ? menuData : path[path.length - 1].children || [];

  const handleNavigateForward = (item: MenuItem, index: number) => {
    if (item.children?.length) {
      clickedIndexRef.current = index;
      setPath((prev) => [...prev, item]);
      setActiveItemId(null); // Clear selection when navigating deeper
    } else {
      setActiveItemId(item.id);
      if (onSelect) {
        onSelect(item);
      }
    }
  };

  const handleNavigateBack = (index: number) => {
    clickedIndexRef.current = null;
    setPath((prev) => prev.slice(0, index));
  };

  const containerVariants: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { staggerChildren: 0.05 } },
    exit: {},
  };

  const itemVariants: Variants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: (index: number) => {
      const clicked = clickedIndexRef.current;
      if (clicked !== null) {
        if (index < clicked)
          return {
            opacity: 0,
            y: -100,
            transition: { duration: 0.3, ease: 'easeOut' },
          };
        if (index > clicked)
          return {
            opacity: 0,
            y: 100,
            transition: { duration: 0.3, ease: 'easeOut' },
          };
        return { opacity: 0, transition: { duration: 0.2 } };
      }
      return { opacity: 0, y: -10, transition: { duration: 0.2 } };
    },
  };

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center overflow-x-hidden bg-transparent pt-8 pb-12 transition-colors duration-300">
      <div className="flex min-h-80 w-full max-w-sm flex-col px-4">
        {/* Breadcrumb */}
        <div className="mb-4 flex flex-col items-start space-y-0.5">
          <AnimatePresence mode="popLayout">
            {path.map((item, idx) => (
              <motion.button
                key={`path-${item.id}`}
                layout="position"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5, transition: { duration: 0.4 } }}
                onClick={() => handleNavigateBack(idx)}
                className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                style={{ marginLeft: `${idx * 12}px` }}
              >
                <ArrowLeft size={14} />
                <motion.span
                  layoutId={`name-${item.id}`}
                  className="inline-block max-w-50 truncate sm:max-w-xs"
                >
                  {item.label}
                </motion.span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Menu List */}
        <div className="relative">
          <AnimatePresence mode="popLayout">
            <motion.ul
              key={path.length === 0 ? 'root' : path[path.length - 1].id}
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex w-full flex-col items-start gap-0.5"
              style={{ paddingLeft: `${path.length * 12}px` }}
            >
              {currentItems.map((item, index) => {
                const hasChildren = !!item.children?.length;

                return (
                  <motion.li
                    key={item.id}
                    custom={index}
                    variants={itemVariants}
                    className="w-full"
                  >
                    <button
                      onClick={() => handleNavigateForward(item, index)}
                      className={cn(
                        'group h-9 w-full rounded-lg px-2.5 text-left text-sm transition-colors duration-200',
                        hasChildren
                          ? 'text-foreground hover:bg-muted hover:text-muted-foreground'
                          : activeItemId === item.id
                            ? 'bg-muted font-medium text-foreground'
                            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                      )}
                    >
                      <motion.span
                        layoutId={hasChildren ? `name-${item.id}` : undefined}
                        className="inline-block"
                      >
                        {item.label}
                      </motion.span>
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default TreeMenu;
