'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { ArrowCounterClockwise, Check, PencilSimple, X } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import useMeasure from 'react-use-measure';
import { cn } from '@/lib/utils';

interface DrawSignatureComponentProps {
  startLabel?: string;
  finishLabel?: string;
  doneLabel?: string;
  defaultStep?: 'idle' | 'drawing' | 'done';
  onFinish?: (canvas: HTMLCanvasElement | null) => void;
  onClear?: () => void;
  onStepChange?: (step: 'idle' | 'drawing' | 'done') => void;
}

export const DrawSignatureComponent: React.FC<DrawSignatureComponentProps> = ({
  startLabel = 'Start Signing',
  finishLabel = 'Finish Signing',
  doneLabel = 'Signing Done',
  defaultStep = 'idle',
  onFinish,
  onClear,
  onStepChange,
}) => {
  const [step, setStep] = useState<'idle' | 'drawing' | 'done'>(defaultStep);
  const [ref, bounds] = useMeasure({ offsetSize: true });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  useEffect(() => {
    if (step === 'drawing' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.strokeStyle = resolvedTheme === 'dark' ? '#ffffff' : '#000000';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (savedSignature) {
        const img = new Image();
        img.src = savedSignature;
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
      }
    }
  }, [step, resolvedTheme, savedSignature]);

  if (!mounted) return null;

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.beginPath();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    setSavedSignature(null);
    onClear?.();
  };

  const finishSigning = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL();
      setSavedSignature(dataUrl);
    }

    setStep('done');
    onFinish?.(canvasRef.current);
  };

  const penColor = resolvedTheme === 'dark' ? 'white' : 'black';

  return (
    <MotionConfig
      transition={{
        type: 'spring',
        bounce: 0.15,
        duration: 0.7,
      }}
    >
      <motion.div
        animate={{
          width: bounds.width > 0 ? bounds.width : 'auto',
          height: bounds.height > 0 ? bounds.height : 'auto',
        }}
        className={cn(
          'relative z-10 flex items-center justify-center overflow-hidden border border-dashed border-transparent transition-colors duration-400 ease-out',
          step === 'drawing' &&
          'border-dashed border-border',
        )}
        style={{
          borderRadius: 16,
        }}
      >
        <div ref={ref} className="i flex shrink-0 p-1">
          <AnimatePresence mode="popLayout" initial={false}>
            {step === 'idle' && (
              <motion.button
                key="start"
                layoutId="container-button"
                onClick={() => setStep('drawing')}
                className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                <motion.div layoutId="container-button-icon">
                  <PencilSimple size={16} />
                </motion.div>
                <motion.span layoutId="container-button-text">
                  {startLabel}
                </motion.span>
              </motion.button>
            )}

            {step === 'drawing' && (
              <motion.div
                key="pad"
                exit={{
                  opacity: 0,
                  y: '-30%',
                  x: '-10%',
                }}
                className="w-[280px] max-w-[280px] rounded-xl border border-border bg-card p-4 pb-3 will-change-transform"
              >
                <div className="mb-4 flex items-center justify-between">
                  <button
                    onClick={clearCanvas}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ArrowCounterClockwise size={14} />
                  </button>

                  <span className="text-sm font-medium text-muted-foreground">
                    Sign
                  </span>

                  <button
                    onClick={() => setStep('idle')}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                </div>

                <canvas
                  ref={canvasRef}
                  width={248}
                  height={160}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="h-[160px] w-full touch-none"
                  style={{
                    cursor: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${penColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>') 0 22, auto`,
                  }}
                />

                <motion.button
                  layoutId="container-button"
                  exit={{ opacity: 0, transition: { duration: 0 } }}
                  whileTap={{ scale: 0.97 }}
                  onClick={finishSigning}
                  className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <motion.div layoutId="container-button-icon">
                    <PencilSimple size={16} />
                  </motion.div>
                  <motion.span layoutId="container-button-text">
                    {finishLabel}
                  </motion.span>
                </motion.button>
              </motion.div>
            )}

            {step === 'done' && (
              <motion.div
                key="done"
                exit={{ opacity: 0, transition: { duration: 0 } }}
                className="flex items-center gap-1.5"
                layoutId="container-button"
              >
                <motion.div className="flex h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-sm font-medium text-background">
                  <motion.div layoutId="container-button-icon">
                    <Check size={16} />
                  </motion.div>
                  <motion.span layoutId="container-button-text">
                    {doneLabel}
                  </motion.span>
                </motion.div>

                <motion.button
                  onClick={() => setStep('drawing')}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted"
                >
                  <PencilSimple size={16} />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </MotionConfig>
  );
};
