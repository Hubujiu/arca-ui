import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = join(root, "tmp", "originals", "beui-previews")

const pages = {
  "press-button": "https://beui.dev/components/motion/button.md",
  "stateful-button": "https://beui.dev/components/motion/button.md",
  "adaptive-stepper": "https://beui.dev/components/motion/adaptive-stepper.md",
  "tabs-bar": "https://beui.dev/components/motion/tabs.md",
  "switch-control": "https://beui.dev/components/motion/switch.md",
  "select-menu": "https://beui.dev/components/motion/select.md",
  "search-combobox": "https://beui.dev/components/motion/combobox.md",
  "multi-select": "https://beui.dev/components/motion/multi-select.md",
  "file-tree": "https://beui.dev/components/motion/file-tree.md",
  "icon-tooltip": "https://beui.dev/components/motion/tooltip.md",
  "context-menu": "https://beui.dev/components/motion/context-menu.md",
  "icon-popover": "https://beui.dev/components/motion/popover.md",
  "morph-modal": "https://beui.dev/components/motion/center-morph-modal.md",
  "text-scramble": "https://beui.dev/components/motion/text-animation.md",
  "digit-swap": "https://beui.dev/components/motion/number.md",
  "animated-badge": "https://beui.dev/components/motion/animated-badge.md",
  "toast-stack": "https://beui.dev/components/motion/animated-toast-stack.md",
  "smooth-scroll": "https://beui.dev/components/motion/scroll-animation.md",
  "range-slider": "https://beui.dev/components/motion/range-slider.md",
  loader: "https://beui.dev/components/motion/loader.md",
  "morphing-tabs": "https://beui.dev/components/blocks/morphing-tabs.md",
  "overflow-actions": "https://beui.dev/components/blocks/overflow-actions.md",
  "attachment-upload": "https://beui.dev/components/blocks/file-upload.md",
  "bloom-menu": "https://beui.dev/components/blocks/bloom-menu.md",
  "not-found": "https://beui.dev/components/blocks/not-found.md",
  "data-table": "https://beui.dev/components/motion/table.md",
  "async-table": "https://beui.dev/components/motion/table.md",
}

await mkdir(outDir, { recursive: true })

function extractTsxBlocks(markdown) {
  const blocks = []
  const re = /```tsx\n([\s\S]*?)```/g
  let match
  while ((match = re.exec(markdown))) blocks.push(match[1].trim())
  return blocks
}

const index = {}
for (const [slug, url] of Object.entries(pages)) {
  const res = await fetch(url, { headers: { Accept: "text/markdown, text/plain" } })
  if (!res.ok) {
    console.error("fail", slug, res.status, url)
    continue
  }
  const markdown = await res.text()
  const blocks = extractTsxBlocks(markdown)
  await writeFile(join(outDir, `${slug}.md`), markdown)
  await writeFile(join(outDir, `${slug}.json`), JSON.stringify({ url, blocks }, null, 2))
  index[slug] = { url, count: blocks.length, titles: [...markdown.matchAll(/^### (.+)$/gm)].map((m) => m[1]) }
  console.log(slug, blocks.length, "blocks")
}

await writeFile(join(outDir, "index.json"), JSON.stringify(index, null, 2))
