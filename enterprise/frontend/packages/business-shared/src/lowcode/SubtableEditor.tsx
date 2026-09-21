import { useState } from "react";
import { AppModal, Button, Input } from "@/shared/ui";
import type { Directory } from "@/organization/model";
import { FieldDesigner } from "./FieldDesigner";
import { subtableSchema, type LowcodeField } from "./field-model";

export function SubtableEditor({ field, onChange, directory, disabled }: { field: LowcodeField; onChange: (patch: Partial<LowcodeField>) => void; directory: Directory; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const config = field.subtableConfig ?? { fields: [] };
  return <section className="space-y-3 border-t border-border pt-4">
    <h3 className="text-caption font-semibold text-muted-foreground">明细行</h3>
    <Input label="最少行数" type="number" min={0} max={100} step={1} value={String(config.minRows ?? 0)} onChange={(next) => { if (next && Number.isInteger(Number(next))) onChange({ subtableConfig: { ...config, minRows: Math.min(100, Math.max(0, Number(next))) } }); }} />
    <Input label="最多行数" type="number" min={1} max={100} step={1} value={String(config.maxRows ?? 50)} onChange={(next) => { if (next && Number.isInteger(Number(next))) onChange({ subtableConfig: { ...config, maxRows: Math.min(100, Math.max(1, Number(next))) } }); }} />
    <p className="text-caption leading-5 text-muted-foreground">已配置 {config.fields.length} 个明细字段。每行独立填写与校验，行顺序可调整。</p>
    <Button variant="outline" disabled={disabled} onClick={() => setOpen(true)}>编辑明细字段</Button>
    <AppModal open={open} onOpenChange={setOpen} title={`${field.label} · 明细字段`} description="每行最多 20 个字段；条件与公式仅引用本行。提交校验对每行分别执行。" className="w-dialog-viewport max-w-384" bodyClassName="max-h-record-view" footer={<Button onClick={() => setOpen(false)}>完成配置</Button>}>
      <FieldDesigner value={subtableSchema(field)} onChange={(schema) => onChange({ subtableConfig: { ...config, fields: schema.fields, validationRules: schema.validationRules } })} directory={directory} disabled={disabled} nested />
    </AppModal>
  </section>;
}
