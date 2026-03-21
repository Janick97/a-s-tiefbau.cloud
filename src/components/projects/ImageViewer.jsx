import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ImageViewer({ images, currentIndex, onClose, onNavigate }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);

  const currentImage = images[currentIndex];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, zoom]);

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      onNavigate(currentIndex + 1);
      resetZoom();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
      resetZoom();
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 1));
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentImage.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentImage.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download fehlgeschlagen:', error);
      window.open(currentImage.file_url, '_blank');
    }
  };

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(1, Math.min(prev + delta, 3)));
  };

  const handleMouseDown = (e) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && imageRef.current) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPan({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-[150]"
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-black/60 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">{currentImage.file_name}</h3>
          <p className="text-sm text-gray-400">
            {currentIndex + 1} / {images.length}
          </p>
        </div>
        <Button
          onClick={onClose}
          variant="ghost"
          className="text-white hover:bg-white/20"
          size="sm"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Image Container */}
      <div
        className="flex-1 flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden w-full"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
      >
        <div
          ref={imageRef}
          className="relative"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          <img
            src={currentImage.file_url}
            alt={currentImage.file_name}
            className="max-w-[90vw] max-h-[80vh] object-contain select-none"
            draggable={false}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 border-t border-gray-700 px-4 py-3 flex items-center justify-center gap-2">
        <Button
          onClick={handleZoomOut}
          variant="ghost"
          className="text-white hover:bg-white/20"
          size="sm"
          disabled={zoom <= 1}
          title="Zoom out (- key)"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm text-gray-400 min-w-12 text-center">{Math.round(zoom * 100)}%</span>
        <Button
          onClick={handleZoomIn}
          variant="ghost"
          className="text-white hover:bg-white/20"
          size="sm"
          disabled={zoom >= 3}
          title="Zoom in (+ key)"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>

        <div className="h-6 w-px bg-gray-600 mx-2" />

        <Button
          onClick={(e) => { e.stopPropagation(); handleDownload(); }}
          variant="ghost"
          className="text-white hover:bg-white/20"
          size="sm"
          title="Download"
        >
          Download
        </Button>

        <div className="h-6 w-px bg-gray-600 mx-2" />

        <Button
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          variant="ghost"
          className="text-white hover:bg-white/20"
          size="sm"
          disabled={currentIndex === 0}
          title="Previous image (← key)"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Button
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          variant="ghost"
          className="text-white hover:bg-white/20"
          size="sm"
          disabled={currentIndex === images.length - 1}
          title="Next image (→ key)"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}