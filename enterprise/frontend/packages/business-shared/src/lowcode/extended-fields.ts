import type { LowcodeField, TableSchema } from "./field-model";
import { numericField } from "./calculations";
import { decimal, decimalRound } from "./decimal";
export type LayoutSection = { id: string; title: string; fieldIds: string[]; collapsed?: boolean };
export type LocationValue = { latitude: number; longitude: number; address?: string };
export type LocationBounds = { south: number; north: number; west: number; east: number };
export const layoutField = (field: LowcodeField) => field.type === "tabs" || field.type === "collapse";
export const richTextLabel = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
const object = (raw: unknown, keys: string[]): raw is Record<string, unknown> => !!raw && typeof raw === "object" && !Array.isArray(raw) && Object.keys(raw).every((key) => keys.includes(key));
const coordinate = (raw: unknown, min: number, max: number) => typeof raw === "number" && Number.isFinite(raw) && raw >= min && raw <= max;
export function validLocation(value: unknown, bounds?: LocationBounds): value is LocationValue {
  return object(value, ["latitude", "longitude", "address"]) && coordinate(value.latitude, -90, 90) && coordinate(value.longitude, -180, 180)
    && (value.address === undefined || typeof value.address === "string" && [...value.address].length <= 500)
    && (!bounds || (value.latitude as number) >= bounds.south && (value.latitude as number) <= bounds.north && (value.longitude as number) >= bounds.west && (value.longitude as number) <= bounds.east);
}
export function validateExtendedFields(schema: TableSchema, child = false): Record<string, string> {
  const errors: Record<string, string> = {}, assigned = new Set<string>();
  for (const field of schema.fields) {
    const fail = (message: string) => { errors[field.id] ??= `${field.label}：${message}`; };
    for (const [key, types] of Object.entries({ richContent: ["remark"], imageConfig: ["displayImage"], layoutConfig: ["tabs", "collapse"], amountConfig: ["chineseAmount"], locationConfig: ["location"] }))
      if (field[key as keyof LowcodeField] !== undefined && !types.includes(field.type)) fail("扩展配置与字段类型不匹配");
    if (field.type === "remark" && (typeof field.richContent !== "string" || [...field.richContent].length > 20000)) fail("备注最多二万个字符");
    if (field.type === "displayImage") {
      const config = field.imageConfig;
      if (!object(config, ["fileIds", "layout", "widthPercent"]) || !Array.isArray(config.fileIds) || config.fileIds.length > 10 || config.fileIds.some((id) => typeof id !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) || new Set(config.fileIds.map((id) => String(id).toLowerCase())).size !== config.fileIds.length || !["grid", "row"].includes(config.layout ?? "grid") || !Number.isInteger(config.widthPercent ?? 100) || (config.widthPercent ?? 100) < 25 || (config.widthPercent ?? 100) > 100) fail("图片引用、布局或宽度比例无效");
    }
    if (layoutField(field)) {
      const config = field.layoutConfig;
      if (child || field.visibleWhen) fail("布局仅用于根字段，不能设置条件隐藏");
      if (!object(config, ["sections", "style"]) || !["tabs", "navigation"].includes(config.style ?? "tabs") || !Array.isArray(config.sections) || !config.sections.length || config.sections.length > 10) { fail("布局需要一至十个分区"); continue; }
      const ids = new Set<string>();
      for (const section of config.sections) {
        if (!object(section, ["id", "title", "fieldIds", "collapsed"]) || typeof section.id !== "string" || !/^[a-z][a-zA-Z0-9]{0,63}$/.test(section.id) || ids.has(section.id) || typeof section.title !== "string" || !section.title.trim() || section.title.length > 80 || !Array.isArray(section.fieldIds) || section.fieldIds.length > 100 || section.collapsed !== undefined && typeof section.collapsed !== "boolean") { fail("分区标识、名称或字段引用无效"); continue; }
        ids.add(section.id);
        for (const id of section.fieldIds) {
          const target = schema.fields.find((entry) => entry.id === id);
          if (!target || layoutField(target) || assigned.has(id)) fail("每个根字段只能归入一个分区，不能引用缺失字段或嵌套布局");
          assigned.add(id);
        }
      }
    }
    if (field.type === "chineseAmount") {
      const config = field.amountConfig;
      if (!object(config, ["sourceFieldId", "unit"]) || !schema.fields.some((entry) => entry.id === config.sourceFieldId && numericField(entry)) || !["元", "圆"].includes(config.unit ?? "元")) fail("请选择同层数值来源和金额单位");
    }
    if (field.locationConfig !== undefined) {
      const config = field.locationConfig;
      if (!object(config, ["bounds"])) { fail("定位范围无效"); continue; }
      const b = config.bounds;
      if (b !== undefined && (!object(b, ["south", "north", "west", "east"]) || !coordinate(b.south, -90, 90) || !coordinate(b.north, -90, 90) || !coordinate(b.west, -180, 180) || !coordinate(b.east, -180, 180) || b.south > b.north || b.west > b.east)) fail("定位范围无效");
    }
  }
  return errors;
}
const digits = "零壹贰叁肆伍陆柒捌玖";
function groupChinese(value: number) {
  let result = "", zero = false;
  for (const [i, unit] of ["仟", "佰", "拾", ""].entries()) {
    const digit = Math.floor(value / 10 ** (3 - i)) % 10;
    if (!digit) { if (result) zero = true; }
    else { result += (zero ? "零" : "") + digits[digit] + unit; zero = false; }
  }
  return result;
}
export function chineseAmount(raw: unknown, unit = "元"): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "number" || !Number.isFinite(raw)) throw new Error("大写金额来源需要数字");
  const rounded = decimalRound(decimal(raw), 2);
  const signed = rounded.coefficient * 10n ** BigInt(2 - rounded.scale), cents = signed < 0n ? -signed : signed;
  if (cents >= 100000000000000000n) throw new Error("大写金额绝对值必须小于一千万亿元");
  let integer = cents / 100n, result = "", zero = false, group = 0;
  while (integer > 0n) {
    const part = Number(integer % 10000n);
    if (!part) { if (result) zero = true; }
    else { result = groupChinese(part) + ["", "万", "亿", "万亿"][group] + (zero && result && !result.startsWith("零") ? "零" : "") + result; zero = part < 1000; }
    integer /= 10000n; group++;
  }
  result = (signed < 0n ? "负" : "") + (result || "零") + unit;
  const jiao = Number(cents / 10n % 10n), fen = Number(cents % 10n);
  if (!jiao && !fen) return result + "整";
  return result + (jiao ? digits[jiao] + "角" : cents >= 100n && fen ? "零" : "") + (fen ? digits[fen] + "分" : "整");
}
