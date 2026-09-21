import { useState } from "react"
import NotificationBell from "@/components/rare-ui/notification-bell"

export function NotificationBellDemo() {
  const [count, setCount] = useState(3)
  return (
    <NotificationBell
      count={count}
      onClick={() => setCount((value) => (value === 0 ? 3 : 0))}
    />
  )
}
