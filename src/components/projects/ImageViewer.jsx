import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ImageViewer({ images, initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef(null);
  const imgRef = useRef(null);

  const current = images[currentIndex];

  const goNext = useCallback(() => {
    setCurrentIndex(i => (i + 1) % images.length);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => (i - 1 + images.length) % images.length);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [images.length]);

  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const zoomIn = () => setZoom(z => Math.min(z + 0.5, 5));
  const zoomOut = () => {
    setZoom(z => {
      const next = Math.max(z - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "+") zoomIn();
      if (e.key === "-") zoomOut();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  // Drag to pan when zoomed
  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };
  const handleMouseMove = (e) => {
    if (!isDragging || zoom <= 1) return;
    setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/95 flex flex-col"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm z-10 flex-shrink-0">
          <div className="text-white">
            <p className="font-medium text-sm truncate max-w-xs">{current?.file_name}</p>
            <p className="text-xs text-gray-400">{currentIndex + 1} / {images.length}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={zoomOut} disabled={zoom <= 1} className="text-white hover:bg-white/20 h-8 w-8 p-0">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-white text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="sm" onClick={zoomIn} disabled={zoom >= 5} className="text-white hover:bg-white/20 h-8 w-8 p-0">
              <ZoomIn className="w-4 h-4" />
            </Button>
            {zoom !== 1 && (
              <Button variant="ghost" size="sm" onClick={resetZoom} className="text-white hover:bg-white/20 h-8 w-8 p-0" title="Zoom zurücksetzen">
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            <a href={current?.file_url} download={current?.file_name}>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 h-8 w-8 p-0" title="Herunterladen">
                <Download className="w-4 h-4" />
              </Button>
            </a>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20 h-8 w-8 p-0 ml-2">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main image area */}
        <div
          className="flex-1 flex items-center justify-center relative overflow-hidden"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          {/* Prev button */}
          {images.length > 1 && (
            <button
              onClick={goPrev}
              className="absolute left-3 z-10 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-all"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}

          <AnimatePresence mode="wait">
            <motion.img
              key={currentIndex}
              ref={imgRef}
              src={current?.file_url}
              alt={current?.file_name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                transformOrigin: 'center center',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          </AnimatePresence>

          {/* Next button */}
          {images.length > 1 && (
            <button
              onClick={goNext}
              className="absolute right-3 z-10 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-all"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          )}
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-black/60 backdrop-blur-sm flex-shrink-0">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => { setCurrentIndex(i); setZoom(1); setPosition({ x: 0, y: 0 }); }}
                className={`flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-all ${i === currentIndex ? 'border-orange-400 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}
              >
                <img src={img.file_url} alt={img.file_name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}