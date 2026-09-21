import DOMPurify from "dompurify";
let sequence = 0;

// Render outside the preview frame; the delivered document remains script-free.
export async function enrichHtml(html: string): Promise<{ html: string; mathCss: string }> {
  const root = document.createElement("div");
  root.innerHTML = DOMPurify.sanitize(html);
  let mathCss = "";
  if (root.querySelector("[data-docweave-math]") || /\$|\\[[(]/.test(root.textContent || "")) {
    const { renderMath } = await import("./math-render");
    mathCss = renderMath(root);
  }
  const blocks = Array.from(root.querySelectorAll("pre > code")).filter(code =>
    code.classList.contains("language-mermaid") ||
    ((!code.className || code.classList.contains("language-css")) && /^\s*(?:graph|flowchart)\s+(?:TD|TB|BT|RL|LR)\b/.test(code.textContent || "")));
  if (blocks.length) {
    const { default: mermaid } = await import("mermaid");
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "default", htmlLabels: false,
      flowchart: { htmlLabels: false }, maxTextSize: 50000 });
    for (const code of blocks) {
      const container = document.createElement("div");
      container.style.cssText = "position:absolute;left:-100000px;top:0;width:860px";
      document.body.append(container);
      try {
        const { svg } = await mermaid.render(`preview-diagram-${++sequence}`, code.textContent || "", container);
        const figure = document.createElement("figure");
        figure.className = "mermaid-diagram";
        figure.innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
        code.parentElement!.replaceWith(figure);
      } catch {
        const message = document.createElement("p");
        message.textContent = "图表语法有误，已保留源码。";
        code.parentElement!.before(message);
      } finally { container.remove(); }
    }
  }
  return { html: root.innerHTML, mathCss };
}
