import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label"; // Added Label import
import { 
  MapPin, 
  Ruler, 
  Package, 
  FileText, 
  Camera, 
  Edit,
  Calendar,
  User,
  Euro,
  Layers,
  X,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Info, // Added Info icon
  CheckCircle // Added CheckCircle icon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const statusColors = {
  planned: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-orange-100 text-orange-800 border-orange-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  approved: "bg-purple-100 text-purple-800 border-purple-200"
};

const statusLabels = {
  planned: "Geplant",
  in_progress: "In Arbeit", 
  completed: "Abgeschlossen",
  approved: "Genehmigt"
};

// Image Preview Modal Component
function ImagePreviewModal({ images, currentIndex, isOpen, onClose, title }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(currentIndex);

  // Update currentImageIndex when currentIndex prop changes
  useEffect(() => {
    setCurrentImageIndex(currentIndex);
  }, [currentIndex]);

  const goToPrevious = useCallback(() => {
    setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0);
  }, [images.length]);

  // Handle keyboard navigation and close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return; // Only respond if modal is open

      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent scrolling on body when modal is open
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto'; // Restore scrolling on body when modal closes
    };
  }, [isOpen, onClose, goToPrevious, goToNext]); // Depend on isOpen, onClose, goToPrevious, goToNext

  if (!isOpen || !images || images.length === 0) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose} // Close modal when clicking outside
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative max-w-[90vw] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to backdrop
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 text-white">
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm text-gray-300">
                  Bild {currentImageIndex + 1} von {images.length}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Image Container */}
            <div className="relative flex-1 flex items-center justify-center">
              <img
                src={images[currentImageIndex]}
                alt={`${title} ${currentImageIndex + 1}`}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
              />

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 bg-black/50 rounded-full p-2"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 bg-black/50 rounded-full p-2"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                </>
              )}
            </div>

            {/* Thumbnail Navigation */}
            {images.length > 1 && (
              <div className="flex justify-center mt-4 space-x-2 max-w-full overflow-x-auto pb-2 px-4 scrollbar-hide">
                {images.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                      index === currentImageIndex 
                        ? 'border-white shadow-lg' 
                        : 'border-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Instructions */}
            <div className="text-center text-gray-400 text-sm mt-4">
              {images.length > 1 && (
                <p>Verwenden Sie die Pfeiltasten oder klicken Sie auf die Pfeile zum Navigieren</p>
              )}
              <p>Drücken Sie ESC oder klicken Sie außerhalb des Bildes zum Schließen</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ExcavationDetail({ excavation, priceItem, onEdit, onClose }) {
  // State to manage the image preview modal
  const [previewImage, setPreviewImage] = useState({
    isOpen: false,
    images: [],
    currentIndex: 0,
    title: ''
  });

  if (!excavation) return null;

  const safeExcavation = {
    id: excavation.id || '',
    location_name: excavation.location_name || 'Unbekannter Standort',
    street: excavation.street || '',
    house_number: excavation.house_number || '',
    postal_code: excavation.postal_code || '',
    city: excavation.city || '',
    latitude: excavation.latitude || null,
    longitude: excavation.longitude || null,
    status: excavation.status || 'planned',
    foreman: excavation.foreman || 'Nicht zugewiesen',
    quantity: excavation.quantity || 1,
    calculated_price: excavation.calculated_price || 0,
    excavation_length: excavation.excavation_length || 0,
    excavation_depth: excavation.excavation_depth || 0,
    excavation_width: excavation.excavation_width || 0,
    excavation_factor: excavation.excavation_factor || 1,
    surface_type: excavation.surface_type || '',
    surface_type_2: excavation.surface_type_2 || '', // Added surface_type_2
    concrete_base_used: excavation.concrete_base_used || false,
    mortar_used: excavation.mortar_used || false,
    gravel_used: excavation.gravel_used || false,
    construction_justification: excavation.construction_justification || '',
    notes: excavation.notes || '',
    photos_before: Array.isArray(excavation.photos_before) ? excavation.photos_before : [],
    photos_after: Array.isArray(excavation.photos_after) ? excavation.photos_after : [],
    photos_environment: Array.isArray(excavation.photos_environment) ? excavation.photos_environment : [],
    photos_backfill: Array.isArray(excavation.photos_backfill) ? excavation.photos_backfill : [],
    photos_surface: Array.isArray(excavation.photos_surface) ? excavation.photos_surface : [],
    created_date: excavation.created_date || null
  };

  const safePriceItem = priceItem || { 
    description: 'Unbekannte Position', 
    unit: 'ST', 
    type: 'Grube',
    item_number: 'N/A'
  };

  const isGrube = safePriceItem.type === 'Grube';
  
  // Positionen die zu "Andere" gehören
  const anderePositionNumbers = [
    '10021010', '10010413', '10037473', '10037352',
    '10037463', '10037372', '10021040', '10037342', '10037363'
  ];
  
  // Grube-Positionen
  const detailDimensionPositions = ['10001', '10002', '10003', '10004', '10005'];
  
  // Ist es eine Graben-Position?
  const isGrabenPosition = safePriceItem.unit === 'M' && 
    !detailDimensionPositions.includes(safePriceItem.item_number) &&
    !anderePositionNumbers.includes(safePriceItem.item_number);

  // Handle image click to open preview modal
  const handleImageClick = (images, index, title) => {
    setPreviewImage({
      isOpen: true,
      images,
      currentIndex: index,
      title
    });
  };

  // Close image preview modal
  const closeImagePreview = () => {
    setPreviewImage({
      isOpen: false,
      images: [],
      currentIndex: 0,
      title: ''
    });
  };

  // Helper function to render image gallery
  const renderImageGallery = (images, title) => {
    if (!images || images.length === 0) return null;

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Camera className="w-4 h-4" />
          {title} ({images.length})
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {images.map((url, index) => (
            <div 
              key={index} 
              className="aspect-square rounded-lg overflow-hidden border border-gray-200 cursor-pointer group"
              onClick={() => handleImageClick(images, index, title)}
            >
              <img 
                src={url} 
                alt={`${title} ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <CardHeader className="flex flex-row items-center justify-between bg-orange-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <Ruler className="w-5 h-5" />
              {safeExcavation.location_name}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onEdit(excavation)} className="text-white hover:bg-white/20">
                <Edit className="w-4 h-4 mr-2" />
                Bearbeiten
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Status und Grundinfo */}
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Badge variant="outline" className={statusColors[safeExcavation.status]}>
                  {statusLabels[safeExcavation.status]}
                </Badge>
                {safeExcavation.created_date && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(safeExcavation.created_date).toLocaleDateString('de-DE')}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  €{safeExcavation.calculated_price.toLocaleString('de-DE')}
                </p>
                <p className="text-sm text-gray-500">
                  {detailDimensionPositions.includes(safePriceItem.item_number) 
                    ? `Faktor: ${safeExcavation.excavation_factor}`
                    : isGrabenPosition 
                    ? `${safeExcavation.excavation_length.toFixed(2)} m`
                    : `${safeExcavation.quantity} ${safePriceItem.unit}`
                  }
                </p>
              </div>
            </div>

            <Separator />

            {/* Adresse und Navigation */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Standort und Navigation
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Adresse</h4>
                    <div className="text-sm text-gray-600">
                      {safeExcavation.street} {safeExcavation.house_number}<br />
                      {safeExcavation.postal_code} {safeExcavation.city}
                    </div>
                  </div>
                  {safeExcavation.latitude && safeExcavation.longitude && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">GPS-Koordinaten</h4>
                      <div className="text-sm text-gray-600 mb-3">
                        {safeExcavation.latitude.toFixed(6)}, {safeExcavation.longitude.toFixed(6)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://www.google.com/maps?q=${safeExcavation.latitude},${safeExcavation.longitude}`, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        Navigation starten
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Position und Abmessungen */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Ruler className="w-5 h-5" />
                Position und Abmessungen
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Position</p>
                  <p className="text-gray-900">{safePriceItem.item_number} - {safePriceItem.description}</p>
                </div>
                
                {isGrube && (safeExcavation.excavation_length || safeExcavation.excavation_width || safeExcavation.excavation_depth) && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Grubenabmessungen</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      <div className="text-center p-2 bg-white rounded border">
                        <p className="text-xs text-gray-500">Länge</p>
                        <p className="font-semibold">{(safeExcavation.excavation_length || 0).toFixed(2)} m</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded border">
                        <p className="text-xs text-gray-500">Breite</p>
                        <p className="font-semibold">{(safeExcavation.excavation_width || 0).toFixed(2)} m</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded border">
                        <p className="text-xs text-gray-500">Tiefe</p>
                        <p className="font-semibold">{(safeExcavation.excavation_depth || 0).toFixed(2)} m</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded border">
                        <p className="text-xs text-gray-500">Faktor</p>
                        <p className="font-semibold">{safeExcavation.excavation_factor}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Volumen: {(safeExcavation.excavation_length * safeExcavation.excavation_width * safeExcavation.excavation_depth * safeExcavation.excavation_factor).toFixed(2)} m³
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-700">Menge und Preis</p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-gray-500">
                        {detailDimensionPositions.includes(safePriceItem.item_number) 
                          ? 'Faktor'
                          : isGrabenPosition 
                          ? 'Länge'
                          : 'Menge'
                        }
                      </p>
                      <p className="font-semibold">
                        {detailDimensionPositions.includes(safePriceItem.item_number) 
                          ? safeExcavation.excavation_factor
                          : isGrabenPosition 
                          ? `${safeExcavation.excavation_length.toFixed(2)} m`
                          : `${safeExcavation.quantity} ${safePriceItem.unit}`
                        }
                      </p>
                    </div>
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-gray-500">Preis</p>
                      <p className="font-semibold text-green-600">€{safeExcavation.calculated_price.toLocaleString('de-DE')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Oberflächendetails und Materialien */}
            {(safeExcavation.surface_type || safeExcavation.surface_type_2 || safeExcavation.concrete_base_used || safeExcavation.mortar_used || safeExcavation.gravel_used) && (
              <Card className="card-elevation border-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Layers className="w-5 h-5 text-blue-600" />
                    Oberflächendetails
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {safeExcavation.surface_type && (
                      <div>
                        <Label className="text-sm text-gray-600">Hauptoberfläche</Label>
                        <Badge className="mt-1 bg-blue-100 text-blue-800 text-base px-3 py-1">
                          {safeExcavation.surface_type}
                        </Badge>
                      </div>
                    )}
                    
                    {safeExcavation.surface_type_2 && (
                      <div>
                        <Label className="text-sm text-gray-600">Zweite Oberfläche</Label>
                        <Badge className="mt-1 bg-purple-100 text-purple-800 text-base px-3 py-1">
                          {safeExcavation.surface_type_2}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1 flex items-center">
                          <Info className="w-3 h-3 inline mr-1" />
                          Zusätzliche Oberflächenart vorhanden
                        </p>
                      </div>
                    )}
                    {(!safeExcavation.surface_type && !safeExcavation.surface_type_2) && (
                      <div>
                        <Label className="text-sm text-gray-600">Oberflächenart</Label>
                        <p className="text-gray-500 mt-1">Nicht angegeben</p>
                      </div>
                    )}
                  </div>

                  {(safeExcavation.concrete_base_used || safeExcavation.mortar_used || safeExcavation.gravel_used) && (
                    <div className="border-t pt-4">
                      <Label className="text-sm text-gray-600 mb-3 block">Verwendete Materialien</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className={`flex items-center gap-2 p-3 rounded-lg ${safeExcavation.concrete_base_used ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                          {safeExcavation.concrete_base_used ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                          )}
                          <span className="text-sm">Unterbeton</span>
                        </div>
                        <div className={`flex items-center gap-2 p-3 rounded-lg ${safeExcavation.mortar_used ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                          {safeExcavation.mortar_used ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                          )}
                          <span className="text-sm">Mörtel</span>
                        </div>
                        <div className={`flex items-center gap-2 p-3 rounded-lg ${safeExcavation.gravel_used ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                          {safeExcavation.gravel_used ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                          )}
                          <span className="text-sm">Splitt</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tiefbaubegründung */}
            {safeExcavation.construction_justification && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Tiefbaubegründung
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-900">{safeExcavation.construction_justification}</p>
                </div>
              </div>
            )}

            {/* Bauleiter */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5" />
                Zuständigkeit
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Bauleiter</p>
                <p className="text-gray-900">{safeExcavation.foreman}</p>
              </div>
            </div>

            {/* Notizen */}
            {safeExcavation.notes && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Zusätzliche Notizen
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-900">{safeExcavation.notes}</p>
                </div>
              </div>
            )}

            {/* Bilder */}
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Dokumentation
              </h3>
              
              <div className="space-y-4">
                {renderImageGallery(safeExcavation.photos_before, "Vorher-Bilder")}
                {renderImageGallery(safeExcavation.photos_environment, "Umfeld-Bilder")}
                {renderImageGallery(safeExcavation.photos_backfill, "Verfüllung-Bilder")}
                {renderImageGallery(safeExcavation.photos_surface, "Oberfläche-Bilder")}
                {renderImageGallery(safeExcavation.photos_after, "Aufmaß Bilder")}
              </div>

              {/* Fallback wenn keine Bilder vorhanden */}
              {(!safeExcavation.photos_before?.length && 
                !safeExcavation.photos_after?.length && 
                !safeExcavation.photos_environment?.length &&
                !safeExcavation.photos_backfill?.length &&
                !safeExcavation.photos_surface?.length) && (
                <div className="text-center text-gray-500 py-8">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Keine Bilder hochgeladen</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        images={previewImage.images}
        currentIndex={previewImage.currentIndex}
        isOpen={previewImage.isOpen}
        onClose={closeImagePreview}
        title={previewImage.title}
      />
    </>
  );
}