import { RichTextSurface } from "@/components/controls";
import { cssLength } from "@/lib/data-style";
import type { DataStyle } from "@/lib/data-style";
import { ActionSurface } from "@/components/controls";
import { useEffect, useRef, useState, type ReactNode } from "react";
import DOMPurify from "dompurify";
import { Button, Input } from "@/shared/ui";
import { type LowcodeField } from "./field-model";
import { richTextLabel, type LocationValue } from "./extended-fields";
import { FileField, type FileContext } from "./FileField";

export function sanitizeRichText(value: unknown): string {
  const html = DOMPurify.sanitize(typeof value === "string" ? value : "", { ALLOWED_TAGS: ["p", "br", "b", "strong", "i", "em", "u", "s", "ul", "ol", "li", "blockquote", "h2", "h3", "pre", "code", "a"], ALLOWED_ATTR: ["href", "title", "rel"], ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false, ALLOWED_URI_REGEXP: /^https?:\/\//i });
  return richTextLabel(html) ? html : "";
}
export function RichContent({ value }: { value: unknown }) {
  return <div className="break-words text-body leading-6 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_h2]:text-title [&_h3]:text-title [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_pre]:whitespace-pre-wrap [&_ul]:list-disc" dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }} />;
}
export function RichTextField({ id, value, onChange, disabled, label, invalid, describedBy, required, maxLength = 20000 }: {
  id: string; value: unknown; onChange: (value: string) => void; disabled?: boolean; label: string; invalid?: boolean; describedBy?: string; required?: boolean; maxLength?: number;
}) {
  const editor = useRef<HTMLDivElement>(null), latest = useRef(onChange); latest.current = onChange;
  const clean = sanitizeRichText(value);
  useEffect(() => { if (editor.current && sanitizeRichText(editor.current.innerHTML) !== clean) editor.current.innerHTML = clean; }, [clean]);
  function update() { if (!editor.current) return; latest.current(sanitizeRichText(editor.current.innerHTML)); }
  const formats = [["bold", "加粗"], ["italic", "斜体"], ["underline", "下划线"], ["insertUnorderedList", "项目列表"], ["insertOrderedList", "编号列表"], ["removeFormat", "清除格式"]];
  return <div className="rounded-card border border-border">
    <div role="toolbar" aria-label={`${label}格式`} className="flex flex-wrap gap-1 border-b border-border p-1.5">{formats.map(([command, title]) => <Button key={command} type="button" size="sm" variant="ghost" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => { editor.current?.focus(); document.execCommand(command); update(); }}>{title}</Button>)}</div>
    <RichTextSurface ref={editor} id={id} role="textbox" aria-label={label} aria-multiline="true" aria-required={required} aria-invalid={invalid || undefined} aria-describedby={describedBy} aria-disabled={disabled || undefined} contentEditable={!disabled} suppressContentEditableWarning className="min-h-36 whitespace-pre-wrap [&_li]:ml-5" onInput={update}
      onPaste={(event) => { event.preventDefault(); const clipboard = event.clipboardData; const text = clipboard.getData("text/plain"); const html = clipboard.getData("text/html"); editor.current?.focus(); if (html) document.execCommand("insertHTML", false, sanitizeRichText(html)); else document.execCommand("insertText", false, text); update(); }}
      onDrop={(event) => event.preventDefault()} />
    <p className={`px-3 pb-2 text-caption ${clean.length > maxLength ? "text-destructive" : "text-muted-foreground"}`}>{clean.length} / {maxLength} 字符（含格式）</p>
  </div>;
}
export function LocationField({ id, value, onChange, disabled, field }: { id: string; value: unknown; onChange: (value: LocationValue | undefined) => void; disabled?: boolean; field: LowcodeField }) {
  const data = value && typeof value === "object" ? value as Partial<LocationValue> : {};
  const [latitude, setLatitude] = useState(data.latitude === undefined ? "" : String(data.latitude)), [longitude, setLongitude] = useState(data.longitude === undefined ? "" : String(data.longitude));
  const [address, setAddress] = useState(data.address ?? "");
  const [notice, setNotice] = useState(""), [busy, setBusy] = useState(false); const request = useRef(0), active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; request.current++; }; }, []);
  useEffect(() => { if (Number.isFinite(data.latitude)) setLatitude(String(data.latitude)); if (Number.isFinite(data.longitude)) setLongitude(String(data.longitude)); }, [data.latitude, data.longitude]);
  useEffect(() => { if (disabled) { request.current++; setBusy(false); } }, [disabled]);
  useEffect(() => { if (data.address !== undefined) setAddress(data.address); }, [data.address]);
  function update(lat: string, lon: string, nextAddress = address) {
    setLatitude(lat); setLongitude(lon); setAddress(nextAddress);
    if (!lat.trim() && !lon.trim() && !nextAddress.trim()) { onChange(undefined); return; }
    onChange({ latitude: lat.trim() ? Number(lat) : NaN, longitude: lon.trim() ? Number(lon) : NaN, ...(nextAddress ? { address: nextAddress } : {}) });
  }
  function locate() {
    if (disabled || busy) return;
    if (!navigator.geolocation) { setNotice("此浏览器不支持定位，请填写经纬度。"); return; }
    setBusy(true); setNotice(""); const token = ++request.current;
    navigator.geolocation.getCurrentPosition((position) => { if (!active.current || token !== request.current) return; setBusy(false); update(String(position.coords.latitude), String(position.coords.longitude)); }, (error) => { if (!active.current || token !== request.current) return; setBusy(false); setNotice(error.code === 1 ? "定位权限未获允许，可手动填写经纬度。" : "定位失败，可手动填写经纬度。"); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }
  return <div id={id} role="group" aria-label={field.label} className="space-y-2">
    <div className="grid grid-cols-1 gap-2 @sm:grid-cols-2"><Input label="纬度" type="number" step="any" min={field.locationConfig?.bounds?.south ?? -90} max={field.locationConfig?.bounds?.north ?? 90} value={latitude} disabled={disabled} onChange={(next) => update(next, longitude)} /><Input label="经度" type="number" step="any" min={field.locationConfig?.bounds?.west ?? -180} max={field.locationConfig?.bounds?.east ?? 180} value={longitude} disabled={disabled} onChange={(next) => update(latitude, next)} /></div>
    <Input label="位置说明" value={address} maxLength={500} disabled={disabled} onChange={(next) => update(latitude, longitude, next)} />
    <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={disabled || busy} onClick={locate}>{busy ? "正在定位…" : "获取当前位置"}</Button><Button variant="ghost" size="sm" disabled={disabled} onClick={() => { request.current++; setBusy(false); setLatitude(""); setLongitude(""); setAddress(""); onChange(undefined); }}>清空位置</Button></div>
    <p className="text-caption text-muted-foreground">点击后浏览器才会申请定位权限；也可手动输入坐标。</p>{notice && <p role="status" className="text-caption text-muted-foreground">{notice}</p>}
  </div>;
}
export function DisplayImages({ field, context }: { field: LowcodeField; context?: FileContext }) {
  return <div style={({ "--dw-data-extended-fields-1-width": cssLength(`${field.imageConfig?.widthPercent ?? 100}%`) }) as DataStyle} className={["dw-data-extended-fields-1", field.imageConfig?.layout === "row" ? "[&_ul]:!grid-cols-1" : undefined].filter(Boolean).join(" ")}>
    <FileField id={`display-${field.id}`} field={{ ...field, type: "image" }} value={field.imageConfig?.fileIds ?? []} onChange={() => {}} readOnly context={context} />
  </div>;
}
export function LayoutField({ field, render, errors }: { field: LowcodeField; render: (ids: string[]) => ReactNode; errors: Record<string, string> }) {
  const sections = field.layoutConfig?.sections ?? [], [selected, setSelected] = useState(sections[0]?.id), [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const errorIn = (ids: string[]) => Object.keys(errors).some((key) => ids.some((id) => key === id || key.startsWith(`${id}.`)));
  const errorSections = sections.filter((section) => errorIn(section.fieldIds)).map((section) => section.id), errorKey = errorSections.join(",");
  useEffect(() => {
    if (!errorSections.length) return;
    setExpanded((previous) => ({ ...previous, ...Object.fromEntries(errorSections.map((id) => [id, true])) }));
    setSelected((previous) => previous && errorSections.includes(previous) ? previous : errorSections[0]);
  }, [errorKey]);
  const active = sections.some((section) => section.id === selected) ? selected : sections[0]?.id;
  if (field.type === "collapse") return <div className="space-y-3">{sections.map((section) => {
    const forced = errorIn(section.fieldIds), open = forced || (expanded[section.id] ?? !section.collapsed);
    return <section key={section.id} className="rounded-card border border-border"><ActionSurface type="button" className={`${""} flex items-center justify-between  text-left `} aria-expanded={open} onClick={() => setExpanded((previous) => ({ ...previous, [section.id]: !open }))}>{section.title}<span aria-hidden>{open ? "−" : "+"}</span></ActionSurface><div hidden={!open} className="space-y-4 p-4">{forced && <p role="alert" className="text-caption text-destructive">此分区有待修正字段</p>}{render(section.fieldIds)}</div></section>;
  })}</div>;
  return <div className={field.layoutConfig?.style === "navigation" ? "flex flex-col gap-4 @lg:flex-row" : "space-y-4"}>
    <div role="tablist" aria-label={field.label} className={field.layoutConfig?.style === "navigation" ? "flex flex-wrap gap-1 @lg:w-36 @lg:shrink-0 @lg:flex-col" : "flex flex-wrap gap-1 border-b border-border pb-2"}>{sections.map((section) => <ActionSurface active={active === section.id} type="button" key={section.id} role="tab" aria-selected={active === section.id}  onClick={() => setSelected(section.id)}>{section.title}{errorIn(section.fieldIds) && " · 待修正"}</ActionSurface>)}</div>
    <div className="min-w-0 flex-1 space-y-4">{sections.map((section) => <section key={section.id} role="tabpanel" aria-label={section.title} hidden={active !== section.id && !errorIn(section.fieldIds)} className="space-y-4">{active !== section.id && errorIn(section.fieldIds) && <p role="alert" className="text-body text-destructive">{section.title}有待修正字段</p>}{render(section.fieldIds)}</section>)}</div>
  </div>;
}
