import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const txt = await readFile("D:/Data/Desktop/UI.txt", "utf8")

function extract(startMarker, endMarker) {
  const start = txt.indexOf(startMarker)
  const end = txt.indexOf(endMarker, start)
  const chunk = txt.slice(start, end === -1 ? undefined : end)
  const firstImport = chunk.indexOf("import {")
  return chunk.slice(firstImport).trim()
}

const avatar = extract(
  "// Transitions.dev — Avatar group hover",
  "内容渐显动画",
)
const skeleton = extract(
  "// Transitions.dev — Skeleton loader",
  "展开：",
)
const plus = extract(
  "// Transitions.dev — Plus to menu morph",
  "开关：",
)
const toggle = extract(
  "// Transitions.dev — Toggle (React, self-contained)",
  "表格：",
)

const files = {
  "src/components/transitions/avatar-group.tsx": avatar + "\n",
  "src/components/transitions/skeleton-reveal.tsx": skeleton + "\n",
  "src/components/transitions/plus-menu.tsx": plus + "\n",
  "src/components/transitions/toggle.tsx": toggle + "\n",
}

for (const [rel, content] of Object.entries(files)) {
  const target = join(root, rel)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, content)
  console.log("wrote", rel, content.length)
}
