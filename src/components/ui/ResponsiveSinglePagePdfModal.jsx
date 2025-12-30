import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

// Helpers
function useLockBodyScroll(active) {
  useEffect(() => {
    if (!active) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prev; };
  }, [active]);
}
function useVhVar(active) {
  useEffect(() => {
    if (!active) return;
    const set = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    set();
    window.addEventListener("resize", set);
    window.addEventListener("orientationchange", set);
    return () => {
      window.removeEventListener("resize", set);
      window.removeEventListener("orientationchange", set);
    };
  }, [active]);
}

export default function ResponsiveSinglePagePdfModal({
  open,
  onClose,
  pdfUrl, // Changed from src to pdfUrl
  title = "Preview",
  isImage = false,
}) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pdfError, setPdfError] = useState(null);
  const containerRef = useRef(null);
  const viewerScrollRef = useRef(null);

  useLockBodyScroll(open);
  useVhVar(open);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      setContainerWidth(Math.max(200, Math.min(w - 16, 1200)));
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setPage(1);
      setPdfError(null);
      if (viewerScrollRef.current) {
        viewerScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
  }, [open, pdfUrl]);

  const changePage = (offset) => {
    setPage(prevPage => {
      const newPage = Math.max(1, Math.min(prevPage + offset, numPages || prevPage));
      if (viewerScrollRef.current) {
        viewerScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return newPage;
    });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight") changePage(1);
      if (e.key === "ArrowLeft") changePage(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, numPages, onClose]);

  if (!open) return null;

  const Btn = ({ disabled, onClick, children, title }) => (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="px-3 py-1.5 rounded-full border border-slate-300 bg-white/90 hover:bg-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition text-sm sm:text-base"
    >
      {children}
    </button>
  );

  console.log("ResponsiveSinglePagePdfModal Props:", { open, pdfUrl, title, isImage });
  console.log("PDF State:", { numPages, page, containerWidth, pdfError });

  return (
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />

      {/* Shell */}
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4 md:p-6"
           style={{ paddingBottom: `max(env(safe-area-inset-bottom, 0px), 0.5rem)` }}>
        <div
          className="w-full max-w-screen-sm md:max-w-xl lg:max-w-3xl rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col"
          style={{
            height: "min(calc(var(--vh, 1vh) * 100 - 1rem), 92vh)"
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b shrink-0">
            <div id="pdf-modal-title" className="font-medium text-slate-800 line-clamp-1">
              {title}
            </div>
            <button
              onClick={onClose}
              className="h-9 w-9 grid place-items-center rounded-full hover:bg-slate-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Viewer (fills space, scrolls if tall) */}
          <div
            ref={viewerScrollRef}
            className="flex-1 min-h-0 overflow-auto bg-slate-50 px-2 sm:px-6 py-3 touch-pan-y"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div ref={containerRef} className="flex justify-center">
              {isImage ? (
                <img
                  src={pdfUrl}
                  alt="Preview"
                  className="max-w-full h-auto rounded-lg shadow bg-white"
                  style={{ maxHeight: "calc(var(--vh, 1vh) * 100 - 12rem)" }}
                />
              ) : pdfUrl ? (
                <Document
                  file={pdfUrl}
                  onLoadSuccess={({ numPages }) => {
                    setNumPages(numPages);
                    setPdfError(null);
                  }}
                  onLoadError={(err) => {
                    console.error("PDF load error:", err);
                    setPdfError(`Failed to load PDF: ${err.message || err.toString()}`);
                  }}
                  loading={
                    <div className="text-slate-500 flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
                      Loading PDF…
                    </div>
                  }
                  error={<div className="text-red-600">{pdfError || "Failed to load PDF."}</div>}
                >
                  <Page
                    pageNumber={page}
                    width={containerWidth || undefined}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
              ) : (
                <div className="text-red-600">No PDF URL provided.</div>
              )}
            </div>
          </div>

          {/* Footer */}
          {!isImage && (
            <div className="flex items-center justify-between gap-3 px-3 sm:px-6 py-3 border-t bg-white shrink-0">
              <div className="text-xs sm:text-sm text-slate-600">
                Page {page} of {numPages || "…"}
              </div>
              <div className="flex items-center gap-2">
                <Btn title="Previous page" disabled={page <= 1}
                     onClick={() => changePage(-1)}>
                  ← Prev
                </Btn>
                <Btn title="Next page" disabled={!numPages || page >= numPages}
                     onClick={() => changePage(1)}>
                  Next →
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
