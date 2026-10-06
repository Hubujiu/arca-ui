export interface Rect { x: number; y: number; width: number; height: number }
export interface OriginTransform { x: number; y: number; scaleX: number; scaleY: number }
/** One geometry read per transition. Missing/unmounted sources use an opacity fallback. */
export function originTransform(source: Rect | null, panel: Rect): OriginTransform | null {
  if (!source) return null
  for (const rect of [source, panel]) {
    if (![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) return null
  }
  return {
    x: source.x + source.width / 2 - panel.x - panel.width / 2,
    y: source.y + source.height / 2 - panel.y - panel.height / 2,
    scaleX: source.width / panel.width,
    scaleY: source.height / panel.height,
  }
}
