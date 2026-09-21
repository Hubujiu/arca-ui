import { cssLength } from "@/lib/data-style";
import type { DataStyle } from "@/lib/data-style";
import { DataTable } from "@/components/controls";
import type { CanonicalNode, CanonicalTable } from "@/shared/api/types";

export function StructuredViewer({ filename, nodes, tables, outline }: { filename: string; nodes: CanonicalNode[]; tables: CanonicalTable[]; outline: boolean }) {
  const headings = nodes.filter(n => ["HEADING", "SECTION", "SHEET", "SLIDE"].includes(n.kind || "") && n.text);
  const parents = new Map(nodes.map(n => [n.id, n]));
  const tableByNode = new Map(tables.map(t => [t.nodeId, t]));
  return <div className="flex min-h-0 flex-1">
    {outline && headings.length > 0 && <nav aria-label="文档目录" className="hidden w-52 shrink-0 overflow-auto border-r border-border bg-card/50 p-4 md:block"><p className="mb-4 text-caption font-medium text-muted-foreground">文档目录</p>{headings.map(n => <a key={n.id} href={`#preview-${n.id}`} className="dw-data-structured-viewer-1 mb-1 block rounded-control px-2 py-2 text-caption leading-5 text-muted-foreground hover:bg-secondary hover:text-foreground" style={({ "--dw-data-structured-viewer-1-padding-left": cssLength(`${8 + Math.min(4, Math.max(0, (n.level || 1) - 1)) * 12}px`) }) as DataStyle}>{n.text}</a>)}</nav>}
    <div className="min-w-0 flex-1 overflow-auto p-4 md:p-8"><article className="mx-auto max-w-4xl rounded-card border border-border bg-card px-6 py-10 md:px-12">
      <h1 className="mb-8 break-words text-heading font-medium">{filename}</h1>
      <div className="space-y-4">{nodes.map(n => {
        const table = tableByNode.get(n.id);
        if (table) return <PreviewTable key={n.id} table={table} />;
        if (n.kind === "DOCUMENT" || !n.text) return null;
        if (n.kind === "CODE") return <pre id={`preview-${n.id}`} key={n.id} className="overflow-auto rounded-control bg-background p-4 font-mono text-body leading-6"><code>{n.text}</code></pre>;
        if (["HEADING", "SECTION", "SHEET", "SLIDE"].includes(n.kind || "")) return <h2 id={`preview-${n.id}`} key={n.id} className="scroll-mt-6 pt-5 text-title font-medium">{n.text}</h2>;
        const list = parents.get(n.parentId || "")?.kind === "LIST";
        return <p id={`preview-${n.id}`} key={n.id} className={`whitespace-pre-wrap break-words text-body leading-7 ${list ? "ml-5 list-item list-disc" : ""}`}>{n.text}</p>;
      })}{tables.filter(t => !nodes.some(n => n.id === t.nodeId)).map(t => <PreviewTable key={t.id} table={t} />)}</div>
    </article></div>
  </div>;
}
function PreviewTable({ table }: { table: CanonicalTable }) {
  return <div className="overflow-auto rounded-control border border-border"><DataTable className="w-full text-left"><tbody>{table.rows?.map((row, i) => <tr key={i} className="border-b border-border last:border-0 even:bg-background/60">{row.cells?.map((cell, j) => <td key={j} rowSpan={cell.rowSpan || 1} colSpan={cell.columnSpan || 1} className="whitespace-pre-wrap border-r border-border px-4 py-3 align-top last:border-0">{cell.text}</td>)}</tr>)}</tbody></DataTable></div>;
}
