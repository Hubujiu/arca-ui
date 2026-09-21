import { createContext, useContext } from 'react';
import { useReducedMotion } from 'motion/react';

/** Optional provider keeps library primitives usable outside the application. */
export const MotionPreferenceContext = createContext(false);
export function useMotionPreference(): boolean {
  const requested = useContext(MotionPreferenceContext);
  const system = useReducedMotion();
  return requested || Boolean(system);
}
