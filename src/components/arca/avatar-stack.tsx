import { AvatarStack } from "@/components/spectrum/avatar-stack"

const PEOPLE = [
  { name: "Ada Lovelace", src: "https://assets.watermelon.sh/wm_olivia.png" },
  { name: "Alan Turing", src: "https://assets.watermelon.sh/wm_ben.png" },
  { name: "Grace Hopper", src: "https://assets.watermelon.sh/wm_emma.png" },
  { name: "Linus Torvalds", src: "https://assets.watermelon.sh/wm_josh.png" },
  { name: "Margaret Hamilton" },
  { name: "Katherine Johnson" },
]

export function AvatarStackDemo() {
  return <AvatarStack items={PEOPLE} />
}
