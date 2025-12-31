import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

import {
  ChevronLeft,
  ChevronRight,
  X,
  Minimize,
  Loader2,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2
} from 'lucide-react';

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const pdfjsOptions = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  disableFontFace: false,
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
  const [scale, setScale] = useState(0.8);
  const [rotation, setRotation] = useState(0);
  const [inputValue, setInputValue] = useState('1');

  const viewerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['p', 's', 'c', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      if (e.key === 'Escape' && !isFullscreen) onClose();
      if (e.key === 'ArrowRight') handleNextPage();
      if (e.key === 'ArrowLeft') handlePrevPage();
      if (e.ctrlKey && (e.key === '=' || e.key === '+')) { e.preventDefault(); handleZoomIn(); }
      if (e.ctrlKey && e.key === '-') { e.preventDefault(); handleZoomOut(); }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [isFullscreen]);

  useEffect(() => {
    setInputValue(pageNumber.toString());
  }, [pageNumber]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (err: Error) => {
    console.error('PDF Load Error:', err);
    setError('Unable to load PDF material. Please check your connection.');
    setIsLoading(false);
  };

  const handlePrevPage = () => setPageNumber(p => Math.max(1, p - 1));
  const handleNextPage = () => setPageNumber(p => Math.min(numPages || p, p + 1));

  const handleZoomIn = () => setScale(s => Math.min(3, s + 0.2));
  const handleZoomOut = () => setScale(s => Math.max(0.5, s - 0.2));
  const resetZoom = () => setScale(1.0);

  const rotateRight = () => setRotation(r => (r + 90) % 360);
  const rotateLeft = () => setRotation(r => (r - 90 + 360) % 360);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const val = parseInt(inputValue);
    if (!isNaN(val) && val >= 1 && val <= (numPages || 1)) {
      setPageNumber(val);
    } else {
      setInputValue(pageNumber.toString());
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      (e.target as HTMLInputElement).blur();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center select-none print:hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <style>{`
        @media print { body { display: none !important; } }
        .react-pdf__Page__canvas {
          margin: 0 auto;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          transition: transform 0.2s ease-out;
        }
        .pdf-content-container {
          perspective: 1000px;
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        ref={viewerRef}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`relative flex flex-col bg-slate-100 w-full h-full overflow-hidden ${isFullscreen ? '' : 'md:m-6 md:rounded-2xl shadow-2xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Classic Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-2 bg-white border-b border-slate-200 z-50 shadow-sm gap-2">
          {/* File Info */}
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
            <div className="flex-shrink-0 p-2 bg-red-100 text-red-600 rounded-lg hidden xs:block">
              <FileText size={18} />
            </div>
            <h3 className="font-bold text-slate-700 truncate text-sm">
              {fileName}
            </h3>
          </div>

          {/* Controls Group */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <button onClick={handleZoomOut} className="p-1.5 text-slate-600 hover:bg-white hover:shadow-sm rounded-md transition-all active:scale-90" title="Zoom Out"><ZoomOut size={16} /></button>
              <button onClick={resetZoom} className="px-2 text-[10px] font-black uppercase text-slate-500 hover:text-blue-600 tracking-tighter w-14 text-center">
                {Math.round(scale * 100)}%
              </button>
              <button onClick={handleZoomIn} className="p-1.5 text-slate-600 hover:bg-white hover:shadow-sm rounded-md transition-all active:scale-90" title="Zoom In"><ZoomIn size={16} /></button>
            </div>

            {/* Rotation Controls */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 hidden xs:flex">
              <button onClick={rotateLeft} className="p-1.5 text-slate-600 hover:bg-white rounded-md active:scale-90" title="Rotate Left"><RotateCcw size={16} /></button>
              <button onClick={rotateRight} className="p-1.5 text-slate-600 hover:bg-white rounded-md active:scale-90" title="Rotate Right"><RotateCw size={16} /></button>
            </div>

            {/* Pagination */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <button onClick={handlePrevPage} disabled={pageNumber <= 1} className="p-1.5 text-slate-600 hover:bg-white rounded-md disabled:opacity-30 active:scale-90"><ChevronLeft size={18} /></button>
              <div className="flex items-center gap-1 mx-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  onKeyDown={handleInputKeyDown}
                  className="w-10 h-7 text-center text-sm font-bold bg-white border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-xs font-bold text-slate-400">/ {numPages || '?'}</span>
              </div>
              <button onClick={handleNextPage} disabled={pageNumber >= (numPages || 1)} className="p-1.5 text-slate-600 hover:bg-white rounded-md disabled:opacity-30 active:scale-90"><ChevronRight size={18} /></button>
            </div>
          </div>

          {/* Actions Group */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors hidden xs:block"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize2 size={20} />}
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1 hidden xs:block"></div>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto bg-slate-200/50 p-4 sm:p-8 no-scrollbar pdf-content-container relative"
          onWheel={(e) => {
            if (e.ctrlKey) {
              e.preventDefault();
              if (e.deltaY < 0) handleZoomIn();
              else handleZoomOut();
            }
          }}
        >
          <div className="min-h-full flex flex-col items-center">
            <AnimatePresence mode="wait">
              {isLoading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/80 z-10"
                >
                  <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
                  <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Optimizing Display...</p>
                </motion.div>
              )}

              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm"
                >
                  <X size={48} className="mx-auto text-red-500 mb-4" />
                  <p className="text-slate-800 font-bold mb-4">{error}</p>
                  <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200">Retry Loading</button>
                </motion.div>
              )}
            </AnimatePresence>

            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
              options={pdfjsOptions}
              className="flex flex-col items-center m-auto"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                devicePixelRatio={Math.min(2, window.devicePixelRatio || 1)}
                renderAnnotationLayer={false}
                renderTextLayer={true}
                loading={
                  <div className="w-[300px] h-[400px] sm:w-[600px] sm:h-[800px] bg-white animate-pulse rounded-xl shadow-lg flex items-center justify-center">
                    <Loader2 className="text-slate-200 animate-spin" size={40} />
                  </div>
                }
              />
            </Document>
          </div>
        </div>

      </motion.div>
    </div>,
    document.body
  );
};

export default PDFViewer;
