import React, { useState, useEffect } from "react";
import { MontageLeistung, MontagePreisItem, User, MontageLeistungMaterial, MontageMaterial } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Camera, X, Wrench } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadFile } from "@/integrations/Core";
import { Badge } from "@/components/ui/badge";

function MontageLeistungForm({ leistung, montageAuftragId, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(leistung || {
    montage_auftrag_id: montageAuftragId,
    preis_item_id: "",
    quantity: 1,
    location_name: "",
    work_description: "",
    photos: [],
    notes: ""
  });
  const [priceItems, setPriceItems] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [items, user] = await Promise.all([
        MontagePreisItem.list(),
        User.me()
      ]);
      setPriceItems(Array.isArray(items) ? items : []);
      setCurrentUser(user);
    };
    loadData();
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
        photos: [...(prev.photos || []), ...urls]
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
      photos: prev.photos.filter(url => url !== urlToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const selectedItem = priceItems.find(p => p.id === formData.preis_item_id);
    if (!selectedItem) {
      alert("Bitte wählen Sie eine Position aus");
      return;
    }

    const calculated_price = selectedItem.price * formData.quantity;
    
    const submitData = {
      ...formData,
      calculated_price,
      monteur_name: currentUser?.full_name || "",
      monteur_user_id: currentUser?.id || "",
      completion_date: new Date().toISOString().split('T')[0]
    };

    onSubmit(submitData);
  };

  const selectedItem = priceItems.find(p => p.id === formData.preis_item_id);

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[95vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base">{leistung ? "Bearbeiten" : "Neue Leistung"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-sm">Position *</Label>
            <Select value={formData.preis_item_id} onValueChange={(val) => setFormData({...formData, preis_item_id: val})} required>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Position wählen..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {priceItems.map(item => (
                  <SelectItem key={item.id} value={item.id} className="text-xs">
                    {item.item_number} - {item.description} (€{item.price.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Menge *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                required
                className="h-9 text-sm"
              />
            </div>
            {selectedItem && (
              <div>
                <Label className="text-sm">Preis</Label>
                <Input
                  value={`€${(selectedItem.price * formData.quantity).toFixed(2)}`}
                  disabled
                  className="h-9 text-sm font-bold bg-green-50"
                />
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm">Standort</Label>
            <Input
              value={formData.location_name}
              onChange={(e) => setFormData({...formData, location_name: e.target.value})}
              placeholder="z.B. Schrank 12, KVz 456"
              className="h-9 text-sm"
            />
          </div>

          <div>
            <Label className="text-sm">Beschreibung</Label>
            <Textarea
              value={formData.work_description}
              onChange={(e) => setFormData({...formData, work_description: e.target.value})}
              placeholder="Durchgeführte Arbeiten..."
              rows={2}
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-sm">Fotos</Label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
              id="photo-upload"
            />
            <label htmlFor="photo-upload">
              <Button type="button" variant="outline" size="sm" className="w-full" asChild>
                <span>
                  <Camera className="w-4 h-4 mr-2" />
                  {uploading ? "Lädt..." : `Fotos (${formData.photos?.length || 0})`}
                </span>
              </Button>
            </label>
            {formData.photos && formData.photos.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-1">
                {formData.photos.map((url, idx) => (
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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none h-10">Abbrechen</Button>
            <Button type="submit" disabled={uploading} className="flex-1 sm:flex-none bg-blue-600 h-10">
              {leistung ? "Aktualisieren" : "Erfassen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MaterialUsageDialog({ montageAuftragId, onClose }) {
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [mats, user] = await Promise.all([
        MontageMaterial.list(),
        User.me()
      ]);
      setMaterials(Array.isArray(mats) ? mats : []);
      setCurrentUser(user);
    };
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await MontageLeistungMaterial.create({
        montage_auftrag_id: montageAuftragId,
        material_id: selectedMaterial,
        quantity_used: quantity,
        usage_date: new Date().toISOString().split('T')[0],
        used_by: currentUser?.full_name || "",
        used_by_user_id: currentUser?.id || ""
      });
      
      alert("Material erfolgreich erfasst!");
      onClose();
    } catch (error) {
      console.error("Fehler beim Erfassen:", error);
      alert("Fehler beim Erfassen des Materials");
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base">Material erfassen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-sm">Material *</Label>
            <Select value={selectedMaterial} onValueChange={setSelectedMaterial} required>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Material wählen..." />
              </SelectTrigger>
              <SelectContent className="max-h-[250px]">
                {materials.map(mat => (
                  <SelectItem key={mat.id} value={mat.id} className="text-xs">
                    {mat.name} ({mat.current_stock} {mat.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm">Menge *</Label>
            <Input
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              required
              className="h-9 text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none h-10">Abbrechen</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none h-10">Erfassen</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function MontageLeistungenManagement({ montageAuftragId, readOnly = false, isMonteur = false }) {
  const [leistungen, setLeistungen] = useState([]);
  const [materialUsage, setMaterialUsage] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [priceItems, setPriceItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingLeistung, setEditingLeistung] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [leist, matUsage, mats, items] = await Promise.all([
        MontageLeistung.filter({ montage_auftrag_id: montageAuftragId }, 'created_date'),
        MontageLeistungMaterial.filter({ montage_auftrag_id: montageAuftragId }, 'created_date'),
        MontageMaterial.list(),
        MontagePreisItem.list()
      ]);
      setLeistungen(Array.isArray(leist) ? leist : []);
      setMaterialUsage(Array.isArray(matUsage) ? matUsage : []);
      setMaterials(Array.isArray(mats) ? mats : []);
      setPriceItems(Array.isArray(items) ? items : []);
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
      if (editingLeistung) {
        await MontageLeistung.update(editingLeistung.id, data);
      } else {
        await MontageLeistung.create(data);
      }
      setShowForm(false);
      setEditingLeistung(null);
      loadData();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern der Leistung");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Leistung wirklich löschen?")) {
      try {
        await MontageLeistung.delete(id);
        loadData();
      } catch (error) {
        console.error("Fehler beim Löschen:", error);
      }
    }
  };

  const totalRevenue = leistungen.reduce((sum, l) => sum + (l.calculated_price || 0), 0);

  if (isLoading) {
    return <div className="p-8 text-center">Lädt...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h3 className="text-base md:text-lg font-bold">Montageleistungen</h3>
          <p className="text-xs md:text-sm text-gray-600">
            {leistungen.length} Leistung(en) - €{totalRevenue.toFixed(2)}
          </p>
        </div>
        {!readOnly && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => setShowMaterialForm(true)} variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Plus className="w-4 h-4 mr-1" />
              Material
            </Button>
            <Button onClick={() => { setEditingLeistung(null); setShowForm(true); }} size="sm" className="flex-1 sm:flex-none bg-blue-600">
              <Plus className="w-4 h-4 mr-1" />
              Leistung
            </Button>
          </div>
        )}
      </div>

      {/* Materialverbrauch - kompakt */}
      {materialUsage.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Materialverbrauch ({materialUsage.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-1.5">
              {materialUsage.map((usage) => {
                const material = materials.find(m => m.id === usage.material_id);
                return material ? (
                  <div key={usage.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{material.name}</p>
                      <p className="text-gray-600">{material.article_number}</p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="font-bold">{usage.quantity_used} {material.unit}</p>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leistungen - kompakt */}
      {leistungen.length === 0 ? (
        <Card className="border-none">
          <CardContent className="p-8 text-center">
            <Wrench className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <h3 className="text-base font-medium text-gray-500 mb-2">Noch keine Leistungen</h3>
            {!readOnly && (
              <Button onClick={() => setShowForm(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Erste Leistung erfassen
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {leistungen.map((leistung) => {
            const priceItem = priceItems.find(p => p.id === leistung.preis_item_id);
            return (
              <motion.div
                key={leistung.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 line-clamp-2">{priceItem?.description || "Unbekannt"}</h4>
                        <p className="text-xs text-gray-500 font-mono">{priceItem?.item_number}</p>
                      </div>
                      {!readOnly && (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingLeistung(leistung); setShowForm(true); }}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(leistung.id)}>
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Menge:</span>
                        <span className="font-medium">{leistung.quantity} {priceItem?.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Preis:</span>
                        <span className="font-bold text-green-600">€{(leistung.calculated_price || 0).toFixed(2)}</span>
                      </div>
                      {leistung.location_name && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Standort: </span>
                          <span className="font-medium">{leistung.location_name}</span>
                        </div>
                      )}
                      {leistung.monteur_name && (
                        <div className="col-span-2 pt-1 border-t">
                          <span className="text-gray-600">Erfasst von: </span>
                          <span className="font-medium text-blue-600">{leistung.monteur_name}</span>
                        </div>
                      )}
                      {leistung.completion_date && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Datum: </span>
                          <span className="font-medium">{new Date(leistung.completion_date).toLocaleDateString('de-DE')}</span>
                        </div>
                      )}
                    </div>

                    {leistung.work_description && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <p className="text-gray-700 line-clamp-2">{leistung.work_description}</p>
                      </div>
                    )}

                    {leistung.photos && leistung.photos.length > 0 && (
                      <div className="mt-2 flex gap-1 overflow-x-auto">
                        {leistung.photos.slice(0, 4).map((url, idx) => (
                          <img key={idx} src={url} alt={`Foto ${idx + 1}`} className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 flex-shrink-0" onClick={() => window.open(url, '_blank')} />
                        ))}
                        {leistung.photos.length > 4 && (
                          <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-600 flex-shrink-0">
                            +{leistung.photos.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <MontageLeistungForm
            leistung={editingLeistung}
            montageAuftragId={montageAuftragId}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingLeistung(null); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMaterialForm && (
          <MaterialUsageDialog
            montageAuftragId={montageAuftragId}
            onClose={() => { setShowMaterialForm(false); loadData(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}