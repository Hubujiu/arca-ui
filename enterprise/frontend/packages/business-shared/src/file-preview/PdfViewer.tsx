import { useEffect, useRef, useState } from "react";
import { IconArrowRight, IconChevronLeft, IconMinus, IconPlus } from "@/shared/icons";
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type RenderTask } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Button } from "@/shared/ui";

GlobalWorkerOptions.workerSrc = workerSrc;

export function PdfViewer({ blob }: { blob: Blob }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy>();
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.12);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    let loading: ReturnType<typeof getDocument> | undefined;
    setPdf(undefined);
    setError(undefined);
    setPages(0);
    blob
      .arrayBuffer()
      .then((buffer) => {
        if (cancelled) return;
        loading = getDocument({ data: new Uint8Array(buffer) });
        return loading.promise;
      })
      .then((doc) => {
        if (cancelled || !doc) return;
        setPdf(doc);
        setPages(doc.numPages);
        setPage(1);
      })
      .catch(() => {
        if (!cancelled) setError("无法解析这份 PDF");
      });
    return () => {
      cancelled = true;
      void loading?.destroy();
    };
  }, [blob]);

  function go(next: number) {
    const value = Math.min(pages, Math.max(1, next));
    setPage(value);
    document.getElementById(`pdf-page-${value}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (error) return <p className="m-auto px-8 text-body text-muted-foreground">{error}</p>;
  if (!pdf) return <p className="m-auto text-body text-muted-foreground">正在绘制页面…</p>;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-center gap-1 px-3 py-2">
        <Button size="icon" variant="ghost" aria-label="缩小" onClick={() => setScale((value) => Math.max(0.7, Number((value - 0.12).toFixed(2))))}>
          <IconMinus size={16} />
        </Button>
        <span className="w-12 text-center text-caption tabular-nums text-muted-foreground">{Math.round(scale * 100)}%</span>
        <Button size="icon" variant="ghost" aria-label="放大" onClick={() => setScale((value) => Math.min(1.8, Number((value + 0.12).toFixed(2))))}>
          <IconPlus size={16} />
        </Button>
        <span className="mx-2 h-3 w-px bg-black/10" />
        <Button size="icon" variant="ghost" aria-label="上一页" disabled={page <= 1} onClick={() => go(page - 1)}>
          <IconChevronLeft size={16} />
        </Button>
        <span className="min-w-16 text-center text-caption tabular-nums text-muted-foreground">
          {page} / {pages}
        </span>
        <Button size="icon" variant="ghost" aria-label="下一页" disabled={page >= pages} onClick={() => go(page + 1)}>
          <IconArrowRight size={16} />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-8 py-4">
        <div className="mx-auto flex w-fit flex-col items-center gap-8 pb-10">
          <PdfPage key={page} pdf={pdf} pageNumber={page} scale={scale} />
        </div>
      </div>
    </div>
  );
}

function PdfPage({
  pdf,
  pageNumber,
  scale,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let renderTask: RenderTask | undefined;
    pdf.getPage(pageNumber).then(async (page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      renderTask = page.render({
        canvas,
        viewport,
        transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0],
      });
      try {
        await renderTask.promise;
      } catch {
        /* cancelled or failed */
      }
    });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pageNumber, pdf, scale]);

  return (
    <figure
      id={`pdf-page-${pageNumber}`}
      className="overflow-hidden rounded-control bg-white shadow-tactile ring-1 ring-black/5"
    >
      <canvas ref={canvasRef} className="block bg-white" />
    </figure>
  );
}
