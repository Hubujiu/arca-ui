import type { ComponentProps } from 'react'
import { WeaveThemeContext } from './theme-context'
import type { WeaveColorMode } from './theme-context'
export function WeaveTheme({theme='light',className='',children,...props}:ComponentProps<'div'> & {theme?:WeaveColorMode}) {
 return <WeaveThemeContext.Provider value={theme}><div {...props} data-theme={theme} className={`wo-theme style-nova ${className}`}>{children}</div></WeaveThemeContext.Provider>
}
