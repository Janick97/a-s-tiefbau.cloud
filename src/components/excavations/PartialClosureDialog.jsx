import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, X, Camera, AlertTriangle, Ruler } from "lucide-react";
import { ExcavationClosure } from "@/entities/all";
import { UploadFile } from "@/integrations/Core";

export default function PartialClosureDialog({ excavation, user, remainingMeters, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    meters_closed: '',
    photos: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const getClosureTypeFromSurface = (surfaceType) => {
    if (!surfaceType) return 'Platten/Pflaster';
    if (surfaceType === 'Asphalt') return 'Asphalt Trag';
    if (surfaceType === 'Beton' || surfaceType === 'Naturstein') return 'Beton/Naturstein';
    if (surfaceType === 'Platten' || surfaceType === 'Pflaster') return 'Platten/Pflaster';
    return 'Platten/Pflaster';
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const filesToUpload = files.slice(0, 10 - formData.photos.length);
    if (filesToUpload.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = filesToUpload.map(file => UploadFile({ file }));
      const uploadedFiles = await Promise.all(uploadPromises);
      const newImageUrls = uploadedFiles.map(res => res.file_url);
      handleInputChange('photos', [...formData.photos, ...newImageUrls]);
    } catch (error) {
      console.error("Fehler beim Hochladen:", error);
      alert("Fehler beim Hochladen der Bilder");
    } finally {
      setIsUploading(false);
      event.target.value = null;
    }
  };

  const handleDeleteImage = (urlToDelete) => {
    handleInputChange('photos', formData.photos.filter(url => url !== urlToDelete));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const metersToClose = parseFloat(formData.meters_closed);
    if (!metersToClose || metersToClose <= 0) {
      alert("Bitte gültige Meter eingeben");
      return;
    }
    
    if (metersToClose > remainingMeters) {
      alert(`Maximal ${remainingMeters.toFixed(2)}m können geschlossen werden`);
      return;
    }

    if (formData.photos.length < 2) {
      alert("Bitte mindestens 2 Fotos hochladen");
      return;
    }

    setIsSubmitting(true);
    try {
      // Teilabschluss erstellen
      await ExcavationClosure.create({
        excavation_id: excavation.id,
        closed_by: user?.full_name || 'Unbekannt',
        closed_by_user_id: user?.id,
        meters_closed: metersToClose,
        closure_date: new Date().toISOString().split('T')[0],
        closure_type: getClosureTypeFromSurface(excavation?.surface_type),
        surface_type: excavation?.surface_type,
        photos: formData.photos
      });

      // Wenn alle Meter geschlossen wurden, Graben komplett abschließen
      const { Excavation } = await import('@/entities/all');
      if (metersToClose >= remainingMeters - 0.01) { // Toleranz für Rundungsfehler
        const surfaceCommission = (excavation.calculated_price || 0) * 0.3;
        await Excavation.update(excavation.id, {
          is_closed: true,
          closed_date: new Date().toISOString().split('T')[0],
          closed_by: user?.full_name || 'Unbekannt',
          closed_by_user_id: user?.id,
          surface_commission: surfaceCommission
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern des Teilabschlusses");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Teilabschluss verbuchen</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Standort:</span>
                <span className="font-semibold">{excavation?.location_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Oberfläche:</span>
                <span className="font-semibold">{excavation?.surface_type || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gesamtlänge:</span>
                <span className="font-semibold">{excavation?.excavation_length?.toFixed(1)} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Noch offen:</span>
                <span className="font-semibold text-orange-600">{remainingMeters.toFixed(1)} m</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meters_closed">
              Geschlossene Meter * (max. {remainingMeters.toFixed(1)} m)
            </Label>
            <div className="flex gap-2">
              <Input
                id="meters_closed"
                type="number"
                step="0.1"
                min="0"
                max={remainingMeters}
                value={formData.meters_closed}
                onChange={(e) => handleInputChange('meters_closed', e.target.value)}
                placeholder={`z.B. ${Math.min(10, remainingMeters).toFixed(1)}`}
                className="text-lg font-semibold flex-1"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleInputChange('meters_closed', remainingMeters.toString())}
                className="whitespace-nowrap"
              >
                Alle ({remainingMeters.toFixed(1)}m)
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Tipp: Klicken Sie auf "Alle", um den kompletten Graben abzuschließen
            </p>
          </div>

          <div className="space-y-2">
            <Label>Fotos hochladen * (mind. 2 Fotos)</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              {formData.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {formData.photos.map((url, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                      <img src={url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(url)}
                        disabled={isUploading}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Input
                id="file-upload"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading || formData.photos.length >= 10}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('file-upload').click()}
                disabled={isUploading || formData.photos.length >= 10}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Lädt hoch...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    {formData.photos.length === 0 
                      ? 'Fotos auswählen (mind. 2)' 
                      : `${formData.photos.length}/10 Fotos`}
                  </>
                )}
              </Button>
              
              {formData.photos.length > 0 && formData.photos.length < 2 && (
                <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Bitte laden Sie noch mindestens {2 - formData.photos.length} Foto(s) hoch.
                </p>
              )}
              
              {formData.photos.length >= 2 && (
                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Mindestanzahl erreicht!
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || formData.photos.length < 2 || !formData.meters_closed}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Speichere...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Teilabschluss verbuchen
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}