import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "tmp", "originals")

const items = [
  ["beui", "button-base", "https://beui.dev/r/button-base.json"],
  ["beui", "button-stateful", "https://beui.dev/r/button-stateful.json"],
  ["beui", "adaptive-stepper", "https://beui.dev/r/adaptive-stepper.json"],
  ["beui", "tabs", "https://beui.dev/r/tabs.json"],
  ["beui", "switch", "https://beui.dev/r/switch.json"],
  ["beui", "select", "https://beui.dev/r/select.json"],
  ["beui", "combobox", "https://beui.dev/r/combobox.json"],
  ["beui", "multi-select", "https://beui.dev/r/multi-select.json"],
  ["beui", "file-tree", "https://beui.dev/r/file-tree.json"],
  ["beui", "tooltip", "https://beui.dev/r/tooltip.json"],
  ["beui", "context-menu", "https://beui.dev/r/context-menu.json"],
  ["beui", "popover", "https://beui.dev/r/popover.json"],
  ["beui", "center-morph-modal", "https://beui.dev/r/center-morph-modal.json"],
  ["beui", "text-scramble", "https://beui.dev/r/text-scramble.json"],
  ["beui", "digit-swap", "https://beui.dev/r/digit-swap.json"],
  ["beui", "animated-badge", "https://beui.dev/r/animated-badge.json"],
  ["beui", "animated-toast-stack", "https://beui.dev/r/animated-toast-stack.json"],
  ["beui", "smooth-scroll", "https://beui.dev/r/smooth-scroll.json"],
  ["beui", "range-slider-inline", "https://beui.dev/r/range-slider-inline.json"],
  ["beui", "loader", "https://beui.dev/r/loader.json"],
  ["beui", "morphing-tabs", "https://beui.dev/r/morphing-tabs.json"],
  ["beui", "overflow-actions", "https://beui.dev/r/overflow-actions.json"],
  ["beui", "attachment-upload", "https://beui.dev/r/attachment-upload.json"],
  ["beui", "bloom-menu", "https://beui.dev/r/bloom-menu.json"],
  ["beui", "not-found-glitch", "https://beui.dev/r/not-found-glitch.json"],
  ["beui", "table", "https://beui.dev/r/table.json"],
  ["beui", "table-async", "https://beui.dev/r/table-async.json"],
  ["watermelon", "filter-disclosure", "https://registry.watermelon.sh/r/filter-disclosure.json"],
  ["watermelon", "shimmer-button", "https://registry.watermelon.sh/r/shimmer-button.json"],
  ["watermelon", "stepper", "https://registry.watermelon.sh/r/stepper.json"],
  ["watermelon", "time-undo-action", "https://registry.watermelon.sh/r/time-undo-action.json"],
  ["watermelon", "split-button", "https://registry.watermelon.sh/r/split-button.json"],
  ["watermelon", "inline-disclosure-menu", "https://registry.watermelon.sh/r/inline-disclosure-menu.json"],
  ["watermelon", "draw-signature", "https://registry.watermelon.sh/r/draw-signature.json"],
  ["watermelon", "floating-input", "https://registry.watermelon.sh/r/floating-input.json"],
  ["watermelon", "swap-form", "https://registry.watermelon.sh/r/swap-form.json"],
  ["watermelon", "tags", "https://registry.watermelon.sh/r/tags.json"],
  ["watermelon", "pin-item", "https://registry.watermelon.sh/r/pin-item.json"],
  ["watermelon", "expand-details", "https://registry.watermelon.sh/r/expand-details.json"],
  ["watermelon", "inline-edit", "https://registry.watermelon.sh/r/inline-edit.json"],
  ["watermelon", "macos-sidebar", "https://registry.watermelon.sh/r/macos-sidebar.json"],
  ["watermelon", "tree-menu", "https://registry.watermelon.sh/r/tree-menu.json"],
  ["watermelon", "continuous-pagination", "https://registry.watermelon.sh/r/continuous-pagination.json"],
  ["watermelon", "pagination", "https://registry.watermelon.sh/r/pagination.json"],
  ["watermelon", "avatar-7", "https://registry.watermelon.sh/r/avatar-7.json"],
  ["watermelon", "avatar-9", "https://registry.watermelon.sh/r/avatar-9.json"],
  ["watermelon", "avatar-18", "https://registry.watermelon.sh/r/avatar-18.json"],
  ["watermelon", "avatar-19", "https://registry.watermelon.sh/r/avatar-19.json"],
  ["watermelon", "avatar-14", "https://registry.watermelon.sh/r/avatar-14.json"],
  ["watermelon", "breadcrumb-3", "https://registry.watermelon.sh/r/breadcrumb-3.json"],
  ["watermelon", "breadcrumb-8", "https://registry.watermelon.sh/r/breadcrumb-8.json"],
  ["beautifului", "flowchart", "https://www.beautifului.dev/r/flowchart.json"],
  ["spectrumui", "command-search", "https://ui.spectrumhq.in/r/command-search.json"],
  ["spectrumui", "datetime-picker-demo", "https://ui.spectrumhq.in/r/datetime-picker-demo.json"],
  ["spectrumui", "avatar-stack", "https://ui.spectrumhq.in/r/avatar-stack.json"],
  ["spectrumui", "animated-SVG-chart", "https://ui.spectrumhq.in/r/animated-SVG-chart.json"],
  ["spectrumui", "kanbanboard", "https://ui.spectrumhq.in/r/kanbanboard.json"],
  ["spectrumui", "card", "https://ui.spectrumhq.in/r/card.json"],
  ["rare-ui", "notification-bell", "https://ui.shadcn.com/r/swamimalode07/rare-ui/notification-bell"],
  ["rare-ui", "delete-button", "https://ui.shadcn.com/r/swamimalode07/rare-ui/delete-button"],
  ["rare-ui", "otp-input", "https://ui.shadcn.com/r/swamimalode07/rare-ui/otp-input"],
]

const rareFallbacks = [
  ["rare-ui", "notification-bell", "https://raw.githubusercontent.com/swamimalode07/rare-ui/main/public/r/notification-bell.json"],
  ["rare-ui", "delete-button", "https://raw.githubusercontent.com/swamimalode07/rare-ui/main/public/r/delete-button.json"],
  ["rare-ui", "otp-input", "https://raw.githubusercontent.com/swamimalode07/rare-ui/main/public/r/otp-input.json"],
]

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return await res.json()
}

async function save(group, name, data) {
  const dir = join(root, group, name)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, "registry.json"), JSON.stringify(data, null, 2))
  const files = Array.isArray(data.files) ? data.files : []
  for (const file of files) {
    if (!file?.content) continue
    const target = join(dir, file.path?.replaceAll("\\", "/") || "component.tsx")
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, file.content)
  }
  return files.length
}

const results = []
for (const [group, name, url] of items) {
  try {
    const data = await fetchJson(url)
    const count = await save(group, name, data)
    results.push({ group, name, ok: true, files: count, url })
    console.log(`OK ${group}/${name} (${count} files)`)
  } catch (error) {
    results.push({ group, name, ok: false, error: String(error), url })
    console.log(`FAIL ${group}/${name}: ${error}`)
  }
}

for (const [group, name, url] of rareFallbacks) {
  const existing = results.find((item) => item.group === group && item.name === name && item.ok)
  if (existing) continue
  try {
    const data = await fetchJson(url)
    const count = await save(group, name, data)
    const failed = results.find((item) => item.group === group && item.name === name)
    if (failed) Object.assign(failed, { ok: true, files: count, url, error: undefined })
    console.log(`OK fallback ${group}/${name} (${count} files)`)
  } catch (error) {
    console.log(`FAIL fallback ${group}/${name}: ${error}`)
  }
}

await writeFile(join(root, "index.json"), JSON.stringify(results, null, 2))
console.log("done", results.filter((item) => item.ok).length, "/", results.length)
