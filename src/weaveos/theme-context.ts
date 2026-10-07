import { createContext, useContext } from 'react'
export type WeaveColorMode = 'light' | 'dark'
export const WeaveThemeContext = createContext<WeaveColorMode>('light')
export const useWeaveColorMode = () => useContext(WeaveThemeContext)
