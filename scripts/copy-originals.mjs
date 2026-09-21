import { mkdir, readdir, readFile, writeFile, stat } from "node:fs/promises"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const originals = join(root, "tmp", "originals")
const src = join(root, "src")

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(full)))
    else files.push(full)
  }
  return files
}

function rewrite(content) {
  return content
    .replaceAll("from \"framer-motion\"", "from \"motion/react\"")
    .replaceAll("from 'framer-motion'", "from 'motion/react'")
    .replaceAll("@/components/base-ui/", "@/components/ui/")
    .replaceAll("@radix-ui/react-slot", "@/lib/slot")
}

async function writeFileEnsured(target, content) {
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, content)
}

const files = (await walk(originals)).filter(
  (file) => /\.(tsx|ts)$/.test(file) && !file.endsWith("registry.json"),
)

const copied = []

for (const file of files) {
  const rel = relative(originals, file).replaceAll("\\", "/")
  const [group, name, ...restParts] = rel.split("/")
  const rest = restParts.join("/")
  if (!rest || rest === "lib/utils.ts") continue

  const content = rewrite(await readFile(file, "utf8"))
  let targetRel = rest

  if (group === "beui") {
    targetRel = rest
  } else if (group === "watermelon") {
    const fileName = restParts.at(-1)
    targetRel = `components/watermelon/${fileName}`
  } else if (group === "spectrumui") {
    const fileName = restParts.at(-1)
    targetRel = `components/spectrum/${fileName}`
  } else if (group === "rare-ui") {
    const fileName = restParts.at(-1)
    targetRel = `components/rare-ui/${fileName}`
  } else if (group === "beautifului") {
    targetRel = `components/beautifului/${restParts.at(-1)}`
  } else {
    continue
  }

  const target = join(src, targetRel)
  let shouldWrite = true
  try {
    const existing = await readFile(target, "utf8")
    if (existing.length >= content.length) shouldWrite = false
  } catch {
    shouldWrite = true
  }
  if (shouldWrite) {
    await writeFileEnsured(target, content)
    copied.push({ from: rel, to: targetRel, bytes: content.length })
  }
}

await writeFile(
  join(root, "tmp", "originals", "copied.json"),
  JSON.stringify(copied, null, 2),
)
console.log("copied", copied.length)
for (const item of copied) console.log(item.to, "<-", item.from)
