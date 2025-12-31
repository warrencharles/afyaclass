import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

import {
  ChevronLeft,
  ChevronRight,
  X,
  Maximize,
  Minimize,
  Loader2,
  FileText,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

// Configure pdfjs worker
// Configure pdfjs worker to match runtime version exactly
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Standard PDF options to ensure fonts and cmaps load correctly (Best Practice)
// Standard PDF options to ensure fonts and cmaps load correctly (Best Practice)
const pdfjsOptions = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  disableFontFace: false, // Ensure fonts are loaded
};

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ fileUrl, fileName, onClose }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(0); // 0 = Default, 1 = Zoom x1.5, 2 = Zoom x2.0

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Update container width for responsive scaling
  const updateWidth = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth - 32); // Padding
    }
  }, []);

  useEffect(() => {
    updateWidth();
    // Add resize listener with debounce/timeout if needed, but simple is fine
    window.addEventListener('resize', updateWidth);

    // Initial update after a small delay to ensure layout is ready
    const timer = setTimeout(updateWidth, 100);
    return () => {
      window.removeEventListener('resize', updateWidth);
      clearTimeout(timer);
    };
  }, [updateWidth]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setIsLoading(false);
    updateWidth();
  }

  function onDocumentLoadError(err: Error) {
    console.error('PDF Load Error:', err);
    setError('Unable to load PDF.');
    setIsLoading(false);
  }

  // Body scroll lock and security shortcuts
  useEffect(() => {
    // Lock background scroll
    document.body.style.overflow = 'hidden';

    const handleKeydown = (e: KeyboardEvent) => {
      // Block Ctrl/Cmd + P (Print), S (Save), C (Copy), U (Source)
      if ((e.ctrlKey || e.metaKey) && ['p', 's', 'c', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeydown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  const toggleFullscreen = () => {
    // Simply toggle the React state first
    setIsFullscreen(!isFullscreen);

    // Attempt browser-level fullscreen only if available and desired
    if (viewerRef.current) {
      if (!document.fullscreenElement) {
        viewerRef.current.requestFullscreen?.().catch(() => {
          console.warn("Fullscreen API not supported or denied.");
        });
      } else {
        document.exitFullscreen?.();
      }
    }
  };


  const zoomScale = zoomLevel === 0 ? 1 : zoomLevel === 1 ? 1.5 : 2.25;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-0 md:p-6 select-none print:hidden touch-none overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <style>{`
        @media print {
          body { display: none !important; }
        }
        /* Fix extra space below PDF canvas and ensure centering */
        .react-pdf__Page__canvas {
          display: block !important;
          margin: 0 auto;
          image-rendering: -webkit-optimize-contrast; /* Safari/iOS sharpness */
          image-rendering: crisp-edges;
        }
        .react-pdf__Page__textLayer {
          text-rendering: optimizeLegibility;
        }
        /* Prevent background bleed scroll */
        .pdf-viewer-container {
          overscroll-behavior: contain;
        }
        /* Custom scrollbar for better appearance when zoomed */
        .pdf-viewer-container::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .pdf-viewer-container::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.05);
        }
        .pdf-viewer-container::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 4px;
        }
        .pdf-viewer-container::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.2);
        }
        /* Hide scrollbars but allow scrolling if ever needed */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>
      {/* Backdrop (Visual Only) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm -z-10" // Visual background
      />

      {/* Main Modal Container */}
      <motion.div
        ref={viewerRef}
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`
          relative flex flex-col bg-white md:rounded-2xl shadow-2xl overflow-hidden
          w-full h-full md:h-[90vh] md:max-w-6xl
          ${isFullscreen ? 'fixed inset-0 rounded-none h-full max-w-none' : ''}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - "Classic" Light Theme Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 z-50 shadow-sm">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <FileText size={20} />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="font-semibold text-gray-800 truncate text-sm sm:text-base pr-4">
                {fileName}
              </h3>
              <span className="text-xs text-gray-500">
                {numPages ? `${numPages} Pages` : 'Loading...'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 mr-1">
              <button
                onClick={() => setZoomLevel(z => Math.max(0, z - 1))}
                disabled={zoomLevel <= 0}
                className="p-1.5 text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-[10px] font-bold text-gray-400 w-8 text-center uppercase tracking-tighter">
                {zoomLevel === 0 ? '100%' : zoomLevel === 1 ? '150%' : '225%'}
              </span>
              <button
                onClick={() => setZoomLevel(z => Math.min(2, z + 1))}
                disabled={zoomLevel >= 2}
                className="p-1.5 text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>
            </div>
            <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 relative bg-gray-100 overflow-hidden flex flex-col">
          {/* Loading / Error States */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10"
              >
                <Loader2 size={40} className="text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading document...</p>
              </motion.div>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
                <p className="text-red-500 font-medium mb-4">{error}</p>
                <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700">Close</button>
              </div>
            )}
          </AnimatePresence>

          {/* Document Scroll Container */}
          <div
            className={`flex-1 ${zoomLevel > 0 ? 'overflow-auto' : 'overflow-hidden'} p-4 md:p-8 flex justify-center items-center pdf-viewer-container`}
            ref={containerRef}
          >
            <div className={`relative shadow-2xl bg-white origin-center transition-transform duration-200 ${zoomLevel === 0 ? 'flex items-center justify-center' : ''}`}>
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
                className={`${zoomLevel === 0 ? 'flex items-center justify-center overflow-hidden' : ''}`}
                options={pdfjsOptions}
              >
                <div className="relative flex items-center justify-center overflow-hidden">
                  <Page
                    pageNumber={pageNumber}
                    // Balanced scale factor with zoomLevel modifier
                    scale={(containerWidth < 768 ? 1.0 : 1.2) * zoomScale}
                    devicePixelRatio={window.devicePixelRatio || 1}
                    className="shadow-inner"
                    renderAnnotationLayer={false}
                    renderTextLayer={true}
                    loading={<div className="h-[600px] w-400 bg-slate-50 animate-pulse rounded-lg" />}
                  />
                  {/* Invisible Overlay to block interaction/selection */}
                  <div className="absolute inset-0 z-20 cursor-default" />
                </div>
              </Document>
            </div>
          </div>

          {/* Floating Pagination Controls (Bottom Center) */}
          {!isLoading && !error && numPages && numPages > 1 && (
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur shadow-2xl border border-white/10 rounded-full px-6 py-3 flex items-center gap-6 z-50 shadow-black/20"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPageNumber(p => Math.max(1, p - 1));
                }}
                disabled={pageNumber <= 1}
                className="p-1 hover:bg-white/10 rounded-full disabled:opacity-30 text-white transition-all active:scale-90"
              >
                <ChevronLeft size={24} />
              </button>
              <span className="text-sm font-bold text-white w-16 text-center tabular-nums">
                {pageNumber} / {numPages}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPageNumber(p => Math.min(numPages || p, p + 1));
                }}
                disabled={pageNumber >= (numPages || 1)}
                className="p-1 hover:bg-white/10 rounded-full disabled:opacity-30 text-white transition-all active:scale-90"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default PDFViewer;
