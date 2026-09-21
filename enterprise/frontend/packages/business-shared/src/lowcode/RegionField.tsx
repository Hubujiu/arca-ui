import { SelectEntry } from "@/components/controls";
import { Input } from "@/shared/ui";
import { type LowcodeField } from "./field-model";
import { regions, regionVersion, type RegionValue } from "./regions";
export function RegionField({ id, field, value, onChange, disabled }: { id: string; field: LowcodeField; value: unknown; onChange: (value: RegionValue | undefined) => void; disabled?: boolean }) {
  const current = value && typeof value === "object" ? value as RegionValue : undefined, config = field.regionConfig ?? {};
  const codes = current?.codes ?? [], names = current?.names ?? [];
  let nodes = config.provinceCodes?.length ? regions.filter((node) => config.provinceCodes!.includes(node.code)) : regions;
  const selects = [];
  for (let level = 0; level < (config.depth ?? 3); level++) {
    if (level > 0 && !nodes.length) break;
    const options = nodes;
    selects.push(<SelectEntry key={level} id={level === 0 ? id : `${id}-${level}`} aria-label={`${field.label}${["省份","城市","区县"][level]}`} className={""} value={codes[level] ?? ""} disabled={disabled || level > 0 && !codes[level-1]} onChange={(event) => {
      const code = event.target.value, nextCodes = codes.slice(0, level), nextNames = names.slice(0,level);
      if (code) { nextCodes.push(code); nextNames.push(options.find((node) => node.code === code)!.name); }
      onChange(nextCodes.length ? { version:regionVersion,codes:nextCodes,names:nextNames,...(config.address ? {address:current?.address ?? ""} : {})} : undefined);
    }}><option value="">请选择{["省份","城市","区县"][level]}</option>{options.map((node) => <option key={node.code} value={node.code}>{node.name}</option>)}</SelectEntry>);
    nodes = options.find((node) => node.code === codes[level])?.children ?? [];
  }
  return <div className="space-y-2"><div className="grid gap-2 sm:grid-cols-3">{selects}</div>{config.address && <Input aria-label={`${field.label}详细地址`} placeholder="详细地址" maxLength={500} disabled={disabled || !current?.codes.length} value={current?.address ?? ""} onChange={(address) => { if (current) onChange({...current,address}); }} />}</div>;
}
