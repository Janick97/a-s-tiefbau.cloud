import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Upload, Loader2, X, Camera } from "lucide-react";
import { ExcavationClosure } from "@/entities/all";
import { UploadFile } from "@/integrations/Core";

export default function PartialClosureDialog({ excavation, user, remainingMeters, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    meters_closed: '',
    closure_type: '',
    surface_type: excavation?.surface_type || '',
    notes: '',
    photos: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

    if (!formData.closure_type) {
      alert("Bitte Abschlusstyp auswählen");
      return;
    }

    setIsSubmitting(true);
    try {
      await ExcavationClosure.create({
        excavation_id: excavation.id,
        closed_by: user?.full_name || 'Unbekannt',
        closed_by_user_id: user?.id,
        meters_closed: metersToClose,
        closure_date: new Date().toISOString().split('T')[0],
        closure_type: formData.closure_type,
        surface_type: formData.surface_type || excavation?.surface_type,
        photos: formData.photos,
        notes: formData.notes
      });

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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="font-semibold text-blue-900">Graben: {excavation?.location_name}</p>
            <p className="text-blue-800">Gesamtlänge: {excavation?.excavation_length?.toFixed(2)}m</p>
            <p className="text-blue-800">Noch offen: {remainingMeters.toFixed(2)}m</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meters_closed">Geschlossene Meter *</Label>
            <Input
              id="meters_closed"
              type="number"
              step="0.01"
              min="0"
              max={remainingMeters}
              value={formData.meters_closed}
              onChange={(e) => handleInputChange('meters_closed', e.target.value)}
              placeholder={`Max. ${remainingMeters.toFixed(2)}m`}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="closure_type">Abschlusstyp *</Label>
            <Select 
              value={formData.closure_type} 
              onValueChange={(value) => handleInputChange('closure_type', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Typ auswählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asphalt Trag">Asphalt Trag</SelectItem>
                <SelectItem value="Asphalt Fein">Asphalt Fein</SelectItem>
                <SelectItem value="Beton/Naturstein">Beton/Naturstein</SelectItem>
                <SelectItem value="Platten/Pflaster">Platten/Pflaster</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="surface_type">Oberflächenart</Label>
            <Select 
              value={formData.surface_type} 
              onValueChange={(value) => handleInputChange('surface_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Oberfläche..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Naturstein">Naturstein</SelectItem>
                <SelectItem value="Beton">Beton</SelectItem>
                <SelectItem value="Platten">Platten</SelectItem>
                <SelectItem value="Pflaster">Pflaster</SelectItem>
                <SelectItem value="unbefestigt">Unbefestigt</SelectItem>
                <SelectItem value="Asphalt">Asphalt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fotos hochladen</Label>
            {formData.photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {formData.photos.map((url, index) => (
                  <div key={index} className="relative group aspect-square rounded overflow-hidden border">
                    <img src={url} alt={`${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(url)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
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
                  Bilder hinzufügen ({formData.photos.length}/10)
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Optionale Notizen..."
              className="min-h-20"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
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