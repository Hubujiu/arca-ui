export type SignaturePoint = [number, number];
export type SignatureValue = { version: 1; strokes: SignaturePoint[][] };
export const signatureLimits = { strokes: 64, strokePoints: 500, totalPoints: 4000 };
export function validSignature(value: unknown): value is SignatureValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const signature = value as SignatureValue;
  if (Object.keys(signature).some((key) => key !== "version" && key !== "strokes") || signature.version !== 1 || !Array.isArray(signature.strokes) || !signature.strokes.length || signature.strokes.length > signatureLimits.strokes) return false;
  let count = 0, ink = false;
  for (const stroke of signature.strokes) {
    if (!Array.isArray(stroke) || stroke.length < 2 || stroke.length > signatureLimits.strokePoints) return false;
    for (const point of stroke) {
      if (!Array.isArray(point) || point.length !== 2 || point.some((n) => typeof n !== "number" || !Number.isFinite(n)) || point[0] < 0 || point[0] > 1000 || point[1] < 0 || point[1] > 300) return false;
      if (Math.hypot(point[0] - stroke[0][0], point[1] - stroke[0][1]) > 0.5) ink = true;
    }
    count += stroke.length;
  }
  return count <= signatureLimits.totalPoints && ink;
}
export const signatureJsonSchema = {
  type: "object", required: ["version", "strokes"], additionalProperties: false,
  properties: {
    version: { const: 1 },
    strokes: { type: "array", minItems: 1, maxItems: 64, items: {
      type: "array", minItems: 2, maxItems: 500, items: {
        type: "array", minItems: 2, maxItems: 2, items: false,
        prefixItems: [{ type: "number", minimum: 0, maximum: 1000 }, { type: "number", minimum: 0, maximum: 300 }],
      },
    } },
  },
};
