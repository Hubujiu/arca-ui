import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { IconContext } from "@phosphor-icons/react"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <IconContext.Provider value={{ size: 16, weight: "light" }}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <App />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </IconContext.Provider>
  </StrictMode>
)
