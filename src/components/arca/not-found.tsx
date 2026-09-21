import { NotFoundGlitch } from "@/components/motion/not-found/glitch";

function NotFoundGlitchPreview() {
  return (
    <div className="w-full">
      <NotFoundGlitch />
    </div>
  );
}

export function NotFoundDemo() {
  return <NotFoundGlitchPreview />
}
