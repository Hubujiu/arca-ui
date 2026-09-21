import { ShimmerButton } from "@/components/watermelon/shimmer-button"

export function ShimmerButtonDemo() {
  return (
    <div className="flex items-center justify-center gap-4">
      <ShimmerButton className="bg-[#84cc16] text-black">Hover Me</ShimmerButton>
      <ShimmerButton className="bg-emerald-600 text-white">Subscribe</ShimmerButton>
    </div>
  )
}
