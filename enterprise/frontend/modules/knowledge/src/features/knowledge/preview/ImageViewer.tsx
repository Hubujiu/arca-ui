import { useEffect, useRef, useState, type CSSProperties } from "react";
import { IconExpand, IconMinus, IconPlus, IconRotate } from "@/shared/icons";
import { Button, EmptyState } from "@/shared/ui";

export function ImageViewer({ blob, title }: { blob: Blob; title: string }) {
  const [url, setUrl] = useState("");
  const [scale, setScale] = useState(1);
  const [angle, setAngle] = useState(0);
  const [error, setError] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 800, height: 600 });
  const [natural, setNatural] = useState({ width: 1, height: 1 });
  useEffect(() => {
    if (!viewport.current) return;
    const observer = new ResizeObserver(([entry]) => setBounds({ width: Math.max(1, entry.contentRect.width), height: Math.max(1, entry.contentRect.height) }));
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);
  const rotated = angle % 180 !== 0;
  const fit = Math.min(bounds.width / (rotated ? natural.height : natural.width), bounds.height / (rotated ? natural.width : natural.height), 1);
  const width = natural.width * fit * scale, height = natural.height * fit * scale;
  useEffect(() => { const next = URL.createObjectURL(blob); setUrl(next); setScale(1); setAngle(0); setError(false); return () => URL.revokeObjectURL(next); }, [blob]);
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="flex items-center justify-center gap-2 py-2">
      <Button size="icon" variant="ghost" aria-label="缩小图片" disabled={scale <= .25} onClick={() => setScale(v => v - .25)}><IconMinus size={16} /></Button>
      <span className="w-12 text-center text-caption text-muted-foreground">{Math.round(scale * 100)}%</span>
      <Button size="icon" variant="ghost" aria-label="放大图片" disabled={scale >= 3} onClick={() => setScale(v => v + .25)}><IconPlus size={16} /></Button>
      <Button size="icon" variant="ghost" aria-label="旋转图片" onClick={() => setAngle(v => (v + 90) % 360)}><IconRotate size={16} /></Button>
      <Button size="icon" variant="ghost" aria-label="适应窗口" onClick={() => { setScale(1); setAngle(0); }}><IconExpand size={16} /></Button>
    </div>
    {error && <EmptyState title="图片无法显示">文件可能损坏或当前浏览器不支持此格式。</EmptyState>}
    <div ref={viewport} className={`min-h-0 flex-1 overflow-auto p-8 ${error ? "hidden" : ""}`}><div className="dw-image-bounds grid min-h-full min-w-full place-items-center" style={{ "--image-width": `${rotated ? height : width}px`, "--image-height": `${rotated ? width : height}px` } as CSSProperties}><img className="dw-document-image object-contain" src={url || undefined} alt={title} onLoad={e => setNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })} onError={() => setError(true)} style={{ "--image-angle": `${angle}deg`, "--image-width": `${width}px`, "--image-height": `${height}px` } as CSSProperties} /></div></div>
  </div>;
}
