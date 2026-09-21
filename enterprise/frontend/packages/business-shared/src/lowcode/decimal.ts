/** Decimal arithmetic shared by calculation previews; no binary floating-point intermediates. */
export type Decimal = { coefficient: bigint; scale: number };
const ten = (places: number) => 10n ** BigInt(places);
const absolute = (value: bigint) => value < 0n ? -value : value;
export function decimal(value: number): Decimal {
  if (!Number.isFinite(value)) throw new Error("计算需要有限数字");
  const [coefficient, exponent = "0"] = String(value).toLowerCase().split("e"), negative = coefficient.startsWith("-");
  const [whole, fraction = ""] = coefficient.replace(/^[+-]/, "").split(".");
  const scale = fraction.length - Number(exponent), amount = BigInt(whole + fraction) * (negative ? -1n : 1n);
  return bounded({ coefficient: scale < 0 ? amount * ten(-scale) : amount, scale: Math.max(0, scale) });
}
export function bounded(value: Decimal): Decimal {
  if (absolute(value.coefficient) > 1000000000000000n * ten(value.scale)) throw new Error("计算结果绝对值不能超过 1e15");
  return value;
}
function quotient(numerator: bigint, denominator: bigint): bigint {
  if (!denominator) throw new Error("计算不能除以零");
  const integer = numerator / denominator, remainder = numerator % denominator;
  return integer + (absolute(remainder) * 2n >= absolute(denominator) ? (numerator < 0n) !== (denominator < 0n) ? -1n : 1n : 0n);
}
export function decimalRound(value: Decimal, places: number): Decimal {
  return bounded(value.scale <= places ? value : { coefficient: quotient(value.coefficient, ten(value.scale - places)), scale: places });
}
export function decimalAdd(left: Decimal, right: Decimal, subtract = false): Decimal {
  const scale = Math.max(left.scale, right.scale);
  return bounded({ coefficient: left.coefficient * ten(scale - left.scale) + (subtract ? -1n : 1n) * right.coefficient * ten(scale - right.scale), scale });
}
export function decimalMultiply(left: Decimal, right: Decimal): Decimal { return bounded({ coefficient: left.coefficient * right.coefficient, scale: left.scale + right.scale }); }
export function decimalDivide(left: Decimal, right: Decimal): Decimal {
  const exponent = 16 + right.scale - left.scale;
  return bounded({ coefficient: quotient(left.coefficient * ten(Math.max(0, exponent)), right.coefficient * ten(Math.max(0, -exponent))), scale: 16 });
}
export function decimalCompare(left: Decimal, right: Decimal): number {
  const scale = Math.max(left.scale, right.scale), a = left.coefficient * ten(scale - left.scale), b = right.coefficient * ten(scale - right.scale);
  return a < b ? -1 : a > b ? 1 : 0;
}
export function decimalNumber(value: Decimal): number {
  const sign = value.coefficient < 0n ? "-" : "", digits = absolute(value.coefficient).toString().padStart(value.scale + 1, "0");
  return Number(sign + (value.scale ? `${digits.slice(0, -value.scale)}.${digits.slice(-value.scale)}` : digits));
}
