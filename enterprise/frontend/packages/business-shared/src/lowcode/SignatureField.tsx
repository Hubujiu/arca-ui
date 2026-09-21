import { VectorDocument } from "@/components/controls";
import { useRef, useState, type PointerEvent } from "react";
import { Button } from "@/shared/ui";
import { signatureLimits, validSignature, type SignaturePoint, type SignatureValue } from "./signature-model";

export function SignatureImage({ value, label, height }: { value: unknown; label: string; height?: number }) {
  if (!validSignature(value)) return <span className="text-body text-muted-foreground">未签名</span>;
  return <VectorDocument viewBox="0 0 1000 300" preserveAspectRatio={height === undefined ? undefined : "none"} height={height} role="img" aria-label={`${label}的手写签名`} className="max-w-xl">
    {value.strokes.map((stroke, index) => <polyline key={index} points={stroke.map((point) => point.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
  </VectorDocument>;
}

export function SignatureField({ id, label, value, onChange, disabled = false, describedBy, invalid, required, height = 180 }: {
  id: string; label: string; value: unknown; onChange: (value: SignatureValue | undefined) => void;
  disabled?: boolean; describedBy?: string; invalid?: boolean; required?: boolean; height?: number;
}) {
  const active = useRef<{ pointerId: number; points: SignaturePoint[] } | null>(null);
  const [pending, setPending] = useState<SignaturePoint[]>([]), [notice, setNotice] = useState("");
  const strokes = validSignature(value) ? value.strokes : [];
  function point(event: PointerEvent<SVGSVGElement>): SignaturePoint {
    const matrix = event.currentTarget.getScreenCTM();
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix?.inverse());
    return [Math.round(Math.min(1000, Math.max(0, p.x)) * 10) / 10, Math.round(Math.min(300, Math.max(0, p.y)) * 10) / 10];
  }
  function append(event: PointerEvent<SVGSVGElement>) {
    const drawing = active.current;
    if (!drawing || drawing.pointerId !== event.pointerId || disabled) return;
    const next = point(event), last = drawing.points[drawing.points.length - 1];
    if (Math.hypot(next[0] - last[0], next[1] - last[1]) <= 0.5) return;
    if (drawing.points.length >= signatureLimits.strokePoints || strokes.reduce((n, stroke) => n + stroke.length, 0) + drawing.points.length >= signatureLimits.totalPoints) {
      setNotice("签名已达到笔迹上限，请撤销部分笔迹或清空重签。"); return;
    }
    drawing.points.push(next); setPending([...drawing.points]);
  }
  function finish(event: PointerEvent<SVGSVGElement>, cancelled = false) {
    if (active.current?.pointerId !== event.pointerId) return;
    if (!cancelled) append(event);
    const stroke = active.current.points;
    active.current = null; setPending([]);
    if (!cancelled && !disabled && stroke.length > 1) onChange({ version: 1, strokes: [...strokes, stroke] });
  }
  if (disabled) return <div id={id} aria-describedby={describedBy}><SignatureImage value={value} label={label} height={height} /></div>;
  return <div>
    <VectorDocument id={id} viewBox="0 0 1000 300" preserveAspectRatio="none" height={height} role="group" tabIndex={0} aria-label={`${label}手写区域`} aria-required={required} aria-invalid={invalid} aria-describedby={describedBy}
      className="max-w-xl"
      onPointerDown={(event) => {
        if (active.current || event.button !== 0) return;
        if (strokes.length >= signatureLimits.strokes || strokes.reduce((n, stroke) => n + stroke.length, 0) >= signatureLimits.totalPoints - 1) { setNotice("签名已达到笔迹上限，请清空或撤销后重签。"); return; }
        event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setNotice("");
        active.current = { pointerId: event.pointerId, points: [point(event)] }; setPending(active.current.points);
      }} onPointerMove={append} onPointerUp={(event) => finish(event)} onPointerCancel={(event) => finish(event, true)} onLostPointerCapture={(event) => finish(event, true)}>
      {!strokes.length && !pending.length && <text x="500" y="160" textAnchor="middle" fill="currentColor" fontSize="28" pointerEvents="none">请在此处手写签名</text>}
      {[...strokes, ...(pending.length ? [pending] : [])].map((stroke, index) => <polyline key={index} points={stroke.map((p) => p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
    </VectorDocument>
    <div className="mt-2 flex flex-wrap items-center gap-2"><span className="mr-auto text-caption text-muted-foreground">支持鼠标、触屏或手写笔</span>
      <Button size="sm" variant="ghost" disabled={!strokes.length || !!active.current} onClick={() => { const next = strokes.slice(0, -1); onChange(next.length ? { version: 1, strokes: next } : undefined); setNotice(""); }}>撤销上一笔</Button>
      <Button size="sm" variant="ghost" disabled={!strokes.length || !!active.current} onClick={() => { onChange(undefined); setNotice(""); }}>清空重签</Button>
    </div>
    {notice && <p role="status" className="mt-1 text-caption text-destructive">{notice}</p>}
  </div>;
}
