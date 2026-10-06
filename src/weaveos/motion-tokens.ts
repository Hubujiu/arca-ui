/** Shared physical motion; surface geometry is never driven by two animation engines. */
export const springs = {
  press: { type: 'spring', stiffness: 520, damping: 32, mass: 0.65 },
  surface: { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 },
  layout: { type: 'spring', stiffness: 420, damping: 36, mass: 0.8 },
} as const
