import { useState } from "react"
import { Stepper } from "@/components/watermelon/stepper"

export function CounterStepperDemo() {
  const [value, setValue] = useState(50)
  return <Stepper min={0} max={200} value={value} onChange={setValue} />
}
