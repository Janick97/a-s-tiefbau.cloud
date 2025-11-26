import React, { useState, useEffect } from "react";
import { Schaediger, User } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Camera, X, AlertTriangle, Phone, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { UploadFile } from "@/integrations/Core";

function SchaedigerForm({ schaediger, montageAuftragId, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(schaediger || {
    montage_auftrag_id: montageAuftragId,
    schaediger_name: "",
    adresse: "",
    rufnummer: "",
    fotos: [],
    notizen: ""
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const user = await User.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploading(true);
    try {
      const uploadPromises = files.map(file => UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(res => res.file_url);
      setFormData(prev => ({
        ...prev,
        fotos: [...(prev.fotos || []), ...urls]
      }));
    } catch (error) {
      console.error("Upload-Fehler:", error);
      alert("Fehler beim Hochladen der Fotos");
    }
    setUploading(false);
  };

  const removePhoto = (urlToRemove) => {
    setFormData(prev => ({
      ...prev,
      fotos: prev.fotos.filter(url => url !== urlToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      erfasst_von: currentUser?.full_name || "",
      erfasst_von_user_id: currentUser?.id || "",
      erfassungsdatum: new Date().toISOString().split('T')[0]
    };

    onSubmit(submitData);
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[95vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            {schaediger ? "Schädiger bearbeiten" : "Schädiger erfassen"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-sm">Name des Schädigers *</Label>
            <Input
              value={formData.schaediger_name}
              onChange={(e) => setFormData({...formData, schaediger_name: e.target.value})}
              placeholder="Name eingeben..."
              required
              className="h-9 text-sm"
            />
          </div>

          <div>
            <Label className="text-sm">Adresse</Label>
            <Input
              value={formData.adresse}
              onChange={(e) => setFormData({...formData, adresse: e.target.value})}
              placeholder="Straße, Hausnummer, PLZ, Ort"
              className="h-9 text-sm"
            />
          </div>

          <div>
            <Label className="text-sm">Rufnummer</Label>
            <Input
              value={formData.rufnummer}
              onChange={(e) => setFormData({...formData, rufnummer: e.target.value})}
              placeholder="Telefonnummer"
              type="tel"
              className="h-9 text-sm"
            />
          </div>

          <div>
            <Label className="text-sm">Fotos der Beweissicherung *</Label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
              id="schaediger-photo-upload"
            />
            <label htmlFor="schaediger-photo-upload">
              <Button type="button" variant="outline" size="sm" className="w-full" asChild>
                <span>
                  <Camera className="w-4 h-4 mr-2" />
                  {uploading ? "Lädt..." : `Fotos hochladen (${formData.fotos?.length || 0})`}
                </span>
              </Button>
            </label>
            {formData.fotos && formData.fotos.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-1">
                {formData.fotos.map((url, idx) => (
                  <div key={idx} className="relative">
                    <img src={url} alt={`${idx + 1}`} className="w-full h-16 object-cover rounded" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0"
                      onClick={() => removePhoto(url)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm">Notizen</Label>
            <Textarea
              value={formData.notizen}
              onChange={(e) => setFormData({...formData, notizen: e.target.value})}
              placeholder="Zusätzliche Informationen..."
              rows={2}
              className="text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none h-10">
              Abbrechen
            </Button>
            <Button type="submit" disabled={uploading} className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 h-10">
              {schaediger ? "Aktualisieren" : "Erfassen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SchaedigerManagement({ montageAuftragId, readOnly = false }) {
  const [schaedigers, setSchaedigers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchaediger, setEditingSchaediger] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await Schaediger.filter({ montage_auftrag_id: montageAuftragId });
      setSchaedigers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (montageAuftragId) {
      loadData();
    }
  }, [montageAuftragId]);

  const handleSubmit = async (data) => {
    try {
      if (editingSchaediger) {
        await Schaediger.update(editingSchaediger.id, data);
      } else {
        await Schaediger.create(data);
      }
      setShowForm(false);
      setEditingSchaediger(null);
      loadData();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern des Schädigers");
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-sm">Lädt...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h3 className="text-base md:text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Schädiger
          </h3>
          <p className="text-xs md:text-sm text-gray-600">
            {schaedigers.length} Schädiger erfasst
          </p>
        </div>
        {!readOnly && (
          <Button 
            onClick={() => { setEditingSchaediger(null); setShowForm(true); }} 
            size="sm" 
            className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-1" />
            Schädiger erfassen
          </Button>
        )}
      </div>

      {schaedigers.length === 0 ? (
        <Card className="border-none">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <h3 className="text-base font-medium text-gray-500 mb-2">Keine Schädiger erfasst</h3>
            {!readOnly && (
              <Button onClick={() => setShowForm(true)} size="sm" className="bg-red-600 hover:bg-red-700">
                <Plus className="w-4 h-4 mr-2" />
                Schädiger erfassen
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {schaedigers.map((schaediger) => (
            <motion.div
              key={schaediger.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-l-4 border-l-red-500 bg-red-50/50">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        {schaediger.schaediger_name}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        Erfasst: {new Date(schaediger.erfassungsdatum).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {schaediger.adresse && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3 h-3 text-gray-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{schaediger.adresse}</span>
                      </div>
                    )}
                    {schaediger.rufnummer && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-gray-600 flex-shrink-0" />
                        <a href={`tel:${schaediger.rufnummer}`} className="text-blue-600 hover:underline">
                          {schaediger.rufnummer}
                        </a>
                      </div>
                    )}
                  </div>

                  {schaediger.notizen && (
                    <div className="mt-2 p-2 bg-white rounded text-xs">
                      <p className="text-gray-700">{schaediger.notizen}</p>
                    </div>
                  )}

                  {schaediger.fotos && schaediger.fotos.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1">Beweissicherung:</p>
                      <div className="flex gap-1 overflow-x-auto">
                        {schaediger.fotos.map((url, idx) => (
                          <img 
                            key={idx} 
                            src={url} 
                            alt={`Beweis ${idx + 1}`} 
                            className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 flex-shrink-0" 
                            onClick={() => window.open(url, '_blank')} 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {showForm && (
        <SchaedigerForm
          schaediger={editingSchaediger}
          montageAuftragId={montageAuftragId}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingSchaediger(null); }}
        />
      )}
    </div>
  );
}