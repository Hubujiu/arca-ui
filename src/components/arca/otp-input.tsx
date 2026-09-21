import { useState } from "react"

import OtpInput, { type OtpStatus } from "@/components/rare-ui/otp-input"

export function OtpInputDemo() {
  const [status, setStatus] = useState<OtpStatus>("idle")

  return (
    <div className="flex flex-col items-center gap-3">
      <OtpInput
        length={6}
        size="md"
        status={status}
        onChange={() => setStatus("idle")}
        onComplete={(code) =>
          setStatus(code === "123456" ? "success" : "error")
        }
      />
      <p className="text-sm text-muted-foreground">
        Enter 123456 to pass. Any other code fails.
      </p>
    </div>
  )
}
