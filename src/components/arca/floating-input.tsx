import { FloatingInput } from "@/components/watermelon/floating-input"

export function FloatingInputDemo() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-4 p-10">
      <FloatingInput label="Email Address" type="email" />
      <FloatingInput label="Password" type="password" />
    </div>
  )
}
