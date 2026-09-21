import { useState } from "react"
import { SwapForm } from "@/components/watermelon/swap-form"

export function SwapFormDemo() {
  const [isSignIn, setIsSignIn] = useState(true)
  return <SwapForm isSignIn={isSignIn} onModeChange={setIsSignIn} />
}
