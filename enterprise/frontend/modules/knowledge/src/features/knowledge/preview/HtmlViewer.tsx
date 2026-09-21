import { useEffect, useMemo, useState } from "react";
import { enrichHtml } from "./enrichHtml";
import { IconMinus, IconPlus } from "@/shared/icons";
import { Button } from "@/shared/ui";

export function HtmlViewer({ html, title }: { html: string; title: string }) {
  const [size, setSize] = useState(16);
  const [rendered, setRendered] = useState<{ input: string; output: string; mathCss: string }>();
  useEffect(() => {
    let cancelled = false;
    void enrichHtml(html).then(output => { if (!cancelled) setRendered({ input: html, output: output.html, mathCss: output.mathCss }); })
      .catch(() => { if (!cancelled) setRendered({ input: html, output: html, mathCss: "" }); });
    return () => { cancelled = true; };
  }, [html]);
  const source = useMemo(() => {
    const theme = getComputedStyle(document.documentElement);
    const color = (name: string) => theme.getPropertyValue(name).trim();
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'"><style>${rendered?.input === html ? rendered.mathCss : ""}
      .katex-display{overflow-x:auto;overflow-y:hidden;padding:8px 0}.mermaid-diagram{margin:24px 0;overflow:auto;text-align:center}.mermaid-diagram svg{max-width:100%;height:auto}
      *{box-sizing:border-box}body{margin:0;padding:32px 20px;background:${color("--background")};color:${color("--foreground")};font:${size}px/1.85 system-ui,"Microsoft YaHei",sans-serif;overflow-wrap:anywhere}
      article{max-width:860px;min-height:80vh;margin:auto;padding:40px 48px;background:${color("--card")};border:1px solid ${color("--border")};border-radius:12px}
      h1,h2,h3,h4{line-height:1.4;margin:1.6em 0 .65em;font-weight:600}h1:first-child{margin-top:0}h1{font-size:2em}h2{font-size:1.5em}h3{font-size:1.2em}p{margin:1em 0}a{color:${color("--primary")}}blockquote{margin:1.4em 0;padding:8px 20px;border-left:3px solid ${color("--primary")};background:${color("--secondary")}}
      pre{white-space:pre-wrap;overflow:auto;padding:18px;border-radius:8px;background:${color("--background")};font-size:.875em}code{font-family:ui-monospace,monospace}table{display:block;overflow:auto;border-collapse:collapse;margin:24px 0}th,td{border:1px solid ${color("--border")};padding:8px 14px;text-align:left}th{background:${color("--secondary")}}hr{border:0;border-top:1px solid ${color("--border")};margin:2em 0}@media(max-width:600px){body{padding:12px}article{padding:24px 20px}}
      </style></head><body><article>${rendered?.input === html ? rendered.output : html}</article></body></html>`;
  }, [html, rendered, size]);
  return <div data-html-preview-ready={rendered?.input === html} className="flex min-h-0 flex-1 flex-col">
    <div className="flex items-center justify-center gap-2 py-2"><Button size="icon" variant="ghost" aria-label="减小字号" disabled={size <= 12} onClick={() => setSize(v => v - 2)}><IconMinus size={16} /></Button><span className="text-caption text-muted-foreground">{size} px</span><Button size="icon" variant="ghost" aria-label="增大字号" disabled={size >= 24} onClick={() => setSize(v => v + 2)}><IconPlus size={16} /></Button></div>
    <iframe title={title} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={source} className="min-h-0 w-full flex-1 border-0" />
  </div>;
}
