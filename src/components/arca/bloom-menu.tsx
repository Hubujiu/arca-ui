import { BloomMenu } from "@/components/motion/bloom-menu";

function BloomMenuPreview() {
  return (
    <div className="flex min-h-[420px] w-full items-start justify-center pt-24">
      <BloomMenu />
    </div>
  );
}

export function BloomMenuDemo() {
  return <BloomMenuPreview />
}
