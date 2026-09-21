import katex from "katex";
import renderMathInElement from "katex/contrib/auto-render";
import rawKatexCss from "katex/dist/katex.min.css?raw";

const fontFiles = import.meta.glob<string>("/node_modules/katex/dist/fonts/*.woff2", { query: "?inline", import: "default", eager: true });
// Embed bundled fonts: a sandboxed srcdoc has an opaque origin, so remote font URLs require CORS.
export const katexCss = rawKatexCss.replace(/src:([^;}]+)/g, (declaration, sources: string) => {
  const name = sources.match(/(KaTeX_[\w-]+\.woff2)/)?.[1];
  const data = name && fontFiles[`/node_modules/katex/dist/fonts/${name}`];
  return data ? `src:url("${data}") format("woff2")` : declaration;
});

export function renderMath(root: HTMLElement): string {
  for (const math of root.querySelectorAll<HTMLElement>("[data-docweave-math]")) {
    katex.render(math.textContent || "", math, {
      displayMode: math.dataset.docweaveMath === "display", throwOnError: false,
      trust: false, maxExpand: 1000, maxSize: 20,
    });
  }
  renderMathInElement(root, {
    delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false }, { left: "$", right: "$", display: false }],
    throwOnError: false, trust: false, maxExpand: 1000, maxSize: 20,
  });
  return katexCss;
}
