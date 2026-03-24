import React, { useState, useEffect } from "react";
import { MontageLeistung, MontagePreisItem, User, MontageLeistungMaterial, MontageMaterial } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Edit, Trash2, Camera, X, Wrench, Check, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronDown, Package, ShieldAlert, FileStack } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadFile } from "@/integrations/Core";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import BeweissicherungDialog from "@/components/montage/BeweissicherungDialog";
import { base44 } from "@/api/base44Client";

function MontageLeistungForm({ leistung, montageAuftragId, onSubmit, onCancel, onPreviewImages }) {
  const [selectedItems, setSelectedItems] = useState(leistung ? [{
    preis_item_id: leistung.preis_item_id,
    quantity: leistung.quantity
  }] : []);
  const [sharedData, setSharedData] = useState({
    location_name: leistung?.location_name || "",
    work_description: leistung?.work_description || "",
    photos: leistung?.photos || [],
    einmass_skizze: leistung?.einmass_skizze || [],
    notes: leistung?.notes || ""
  });
  const [priceItems, setPriceItems] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [showContinueDialog, setShowContinueDialog] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [items, user] = await Promise.all([
      MontagePreisItem.list(),
      User.me()]
      );
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
      const uploadPromises = files.map((file) => UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map((res) => res.file_url);
      setSharedData((prev) => ({
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
    setSharedData((prev) => ({
      ...prev,
      photos: prev.photos.filter((url) => url !== urlToRemove)
    }));
  };

  const handleSkizzeUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map((file) => UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map((res) => res.file_url);
      setSharedData((prev) => ({
        ...prev,
        einmass_skizze: [...(prev.einmass_skizze || []), ...urls]
      }));
    } catch (error) {
      console.error("Upload-Fehler:", error);
      alert("Fehler beim Hochladen der Skizze");
    }
    setUploading(false);
  };

  const removeSkizze = (urlToRemove) => {
    setSharedData((prev) => ({
      ...prev,
      einmass_skizze: prev.einmass_skizze.filter((url) => url !== urlToRemove)
    }));
  };

  const addItem = () => {
    setSelectedItems([...selectedItems, { preis_item_id: "", quantity: 1 }]);
  };

  const removeItem = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedItems.length === 0 || selectedItems.some((item) => !item.preis_item_id)) {
      alert("Bitte wählen Sie mindestens eine Position aus");
      return;
    }

    // Wenn wir im Edit-Modus sind, nur eine Position bearbeiten
    if (leistung) {
      const selectedItem = priceItems.find((p) => p.id === selectedItems[0].preis_item_id);
      if (!selectedItem) {
        alert("Position nicht gefunden");
        return;
      }

      const calculated_price = selectedItem.price * selectedItems[0].quantity;

      const submitData = {
        montage_auftrag_id: montageAuftragId,
        preis_item_id: selectedItems[0].preis_item_id,
        quantity: selectedItems[0].quantity,
        calculated_price,
        ...sharedData,
        monteur_name: currentUser?.full_name || "",
        monteur_user_id: currentUser?.id || "",
        completion_date: new Date().toISOString().split('T')[0]
      };

      await onSubmit(submitData);
      return;
    }

    // Für neue Leistungen: Mehrere Positionen erstellen
    try {
      for (const item of selectedItems) {
        const selectedItem = priceItems.find((p) => p.id === item.preis_item_id);
        if (!selectedItem) continue;

        const calculated_price = selectedItem.price * item.quantity;

        const submitData = {
          montage_auftrag_id: montageAuftragId,
          preis_item_id: item.preis_item_id,
          quantity: item.quantity,
          calculated_price,
          ...sharedData,
          monteur_name: currentUser?.full_name || "",
          monteur_user_id: currentUser?.id || "",
          completion_date: new Date().toISOString().split('T')[0]
        };

        await onSubmit(submitData);
      }

      // Nach erfolgreichem Speichern Dialog anzeigen
      setShowContinueDialog(true);
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern der Leistungen");
    }
  };

  const handleContinue = () => {
    // Formular zurücksetzen für neue Leistung
    setSelectedItems([{ preis_item_id: "", quantity: 1 }]);
    setSharedData({
      location_name: "",
      work_description: "",
      photos: [],
      einmass_skizze: [],
      notes: ""
    });
    setShowContinueDialog(false);
  };

  const handleFinish = () => {
    setShowContinueDialog(false);
    onCancel();
  };

  return (
    <>
    {!showContinueDialog &&
      <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center bg-black/50">
      <div className="relative w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-2xl sm:rounded-lg bg-white overflow-y-auto overflow-x-hidden flex flex-col">
        <button onClick={onCancel} className="absolute top-4 right-4 z-10 rounded-sm opacity-70 hover:opacity-100 transition-opacity">
          <X className="h-4 w-4" />
          <span className="sr-only">Schließen</span>
        </button>
        <div className="p-4">
        <div className="pb-2">
          <h2 className="text-lg sm:text-base font-semibold">{leistung ? "Leistung bearbeiten" : "Neue Leistung"}</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-3 pb-4">
          {/* Positionen - mehrere auswählbar, wenn nicht im Edit-Modus */}
          <div>
            <Label className="text-sm flex items-center justify-between">
              <span>Positionen *</span>
              {!leistung &&
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" />
                  Position hinzufügen
                </Button>
                  }
            </Label>
            
            <div className="space-y-2 mt-2">
              {selectedItems.map((item, index) => {
                    const selectedPriceItem = priceItems.find((p) => p.id === item.preis_item_id);
                    return (
                      <div key={index} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1">
                        <Label className="text-xs mb-1">Position</Label>
                        <Popover open={comboOpen === index} onOpenChange={(open) => setComboOpen(open ? index : false)}>
                          <PopoverTrigger asChild>
                            <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between h-9 text-xs min-w-0">
                                
                              {selectedPriceItem ?
                                  <span className="truncate">{selectedPriceItem.item_number} - {selectedPriceItem.description}</span> :

                                  "Position suchen..."
                                  }
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[min(400px,calc(100vw-2rem))] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Position suchen..." className="h-9" />
                              <CommandEmpty>Keine Position gefunden.</CommandEmpty>
                              <CommandGroup className="max-h-[300px] overflow-auto">
                                {priceItems.map((priceItem) =>
                                    <CommandItem
                                      key={priceItem.id}
                                      value={`${priceItem.item_number} ${priceItem.description}`}
                                      onSelect={() => {
                                        updateItem(index, 'preis_item_id', priceItem.id);
                                        setComboOpen(false);
                                      }}>
                                    
                                    <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          item.preis_item_id === priceItem.id ? "opacity-100" : "opacity-0"
                                        )} />
                                    
                                    <div className="flex-1">
                                      <div className="font-medium text-xs">{priceItem.item_number}</div>
                                      <div className="text-xs text-gray-600">{priceItem.description}</div>
                                      <div className="text-xs text-green-600 font-semibold">€{priceItem.price.toFixed(2)}</div>
                                    </div>
                                  </CommandItem>
                                    )}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      {!leistung && selectedItems.length > 1 &&
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                          
                          <X className="w-4 h-4" />
                        </Button>
                          }
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Menge *</Label>
                        <Input
                              type="number"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              required
                              className="h-9 text-sm" />
                          
                      </div>
                      {selectedPriceItem &&
                          <div>
                          <Label className="text-xs">Preis</Label>
                          <Input
                              value={`€${(selectedPriceItem.price * item.quantity).toFixed(2)}`}
                              disabled
                              className="h-9 text-sm font-bold bg-green-50" />
                          
                        </div>
                          }
                    </div>
                  </div>);

                  })}
            </div>
          </div>

          {/* Gesamtpreis anzeigen wenn mehrere Positionen */}
          {selectedItems.length > 1 &&
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-800">Gesamtsumme:</span>
                <span className="text-lg font-bold text-green-700">
                  €{selectedItems.reduce((sum, item) => {
                      const priceItem = priceItems.find((p) => p.id === item.preis_item_id);
                      return sum + (priceItem ? priceItem.price * item.quantity : 0);
                    }, 0).toFixed(2)}
                </span>
              </div>
            </div>
              }

          {/* Gemeinsame Daten für alle Positionen */}
          <div className="border-t pt-3">
            <p className="text-xs text-gray-600 mb-2">
              {!leistung && selectedItems.length > 1 ?
                  "Die folgenden Daten gelten für alle ausgewählten Positionen:" :
                  "Weitere Angaben:"}
            </p>
            
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Standort</Label>
                <Input
                      value={sharedData.location_name}
                      onChange={(e) => setSharedData({ ...sharedData, location_name: e.target.value })}
                      placeholder="z.B. Schrank 12, KVz 456"
                      className="h-9 text-sm" />
                  
              </div>

              <div>
                <Label className="text-sm">Beschreibung</Label>
                <Textarea
                      value={sharedData.work_description}
                      onChange={(e) => setSharedData({ ...sharedData, work_description: e.target.value })}
                      placeholder="Durchgeführte Arbeiten..."
                      rows={2}
                      className="text-sm" />
                  
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm">Fotos</Label>
            <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload" />
            <label htmlFor="photo-upload">
              <Button type="button" variant="outline" size="sm" className="w-full" asChild>
                <span>
                  <Camera className="w-4 h-4 mr-2" />
                  {uploading ? "Lädt..." : `Fotos hinzufügen (${sharedData.photos?.length || 0} vorhanden)`}
                </span>
              </Button>
            </label>
            {sharedData.photos && sharedData.photos.length > 0 &&
                <div className="mt-2 grid grid-cols-3 gap-2">
                {sharedData.photos.map((url, idx) =>
                  <div key={idx} className="relative group aspect-square">
                    <img
                      src={url}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover rounded-lg cursor-pointer border border-gray-200 group-hover:border-blue-400 transition-all"
                      onClick={() => onPreviewImages && onPreviewImages(sharedData.photos, idx)} />
                    
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePhoto(url)}>
                      
                      <X className="h-3 w-3" />
                    </Button>
                    <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[9px] px-1 rounded">{idx + 1}</div>
                  </div>
                  )}
              </div>
                }
          </div>

          <div>
            <Label className="text-sm">Einmaß-Skizze</Label>
            <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleSkizzeUpload}
                  className="hidden"
                  id="skizze-upload" />
            <label htmlFor="skizze-upload">
              <Button type="button" variant="outline" size="sm" className="w-full bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" asChild>
                <span>
                  <Camera className="w-4 h-4 mr-2" />
                  {uploading ? "Lädt..." : `Einmaß-Skizze hinzufügen (${sharedData.einmass_skizze?.length || 0} vorhanden)`}
                </span>
              </Button>
            </label>
            {sharedData.einmass_skizze && sharedData.einmass_skizze.length > 0 &&
                <div className="mt-2 grid grid-cols-3 gap-2">
                {sharedData.einmass_skizze.map((url, idx) =>
                  <div key={idx} className="relative group aspect-square">
                    <img
                      src={url}
                      alt={`Skizze ${idx + 1}`}
                      className="w-full h-full object-cover rounded-lg cursor-pointer border-2 border-amber-300 group-hover:border-amber-500 transition-all"
                      onClick={() => {setFormPreviewImages(sharedData.einmass_skizze);setFormPreviewIndex(idx);}} />
                    
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeSkizze(url)}>
                      
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  )}
              </div>
                }
          </div>

          <div className="flex gap-2 pt-4 border-t mt-4 flex-col sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none h-12 sm:h-10 text-base sm:text-sm">Abbrechen</Button>
            <Button type="submit" disabled={uploading} className="flex-1 sm:flex-none bg-blue-600 h-12 sm:h-10 text-base sm:text-sm">
              {leistung ? "Aktualisieren" : "Weiter"}
            </Button>
          </div>
        </form>
        </div>
      </div>
    </div>
      }



    {/* Dialog für "Weitere Leistung erfassen" */}
    <Dialog open={showContinueDialog} onOpenChange={handleFinish}>
      <DialogContent className="max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Leistung erfasst! ✓</DialogTitle>
        </DialogHeader>
        <div className="text-center py-4">
          <p className="text-gray-600 mb-4">Möchten Sie eine weitere Leistung erfassen?</p>
        </div>
        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          <Button variant="outline" onClick={handleFinish} className="flex-1 h-12 sm:h-10 text-base sm:text-sm">
            Fertig
          </Button>
          <Button onClick={handleContinue} className="flex-1 bg-blue-600 h-12 sm:h-10 text-base sm:text-sm">
            Weitere Leistung
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>);

}

function MaterialUsageDialog({ montageAuftragId, editingMaterial, onClose }) {
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(editingMaterial?.material_id || "");
  const [quantity, setQuantity] = useState(editingMaterial?.quantity_used || 1);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchMaterial, setSearchMaterial] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const [mats, user] = await Promise.all([
      MontageMaterial.list(),
      User.me()]
      );
      setMaterials(Array.isArray(mats) ? mats : []);
      setCurrentUser(user);
    };
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingMaterial) {
        await MontageLeistungMaterial.update(editingMaterial.id, {
          material_id: selectedMaterial,
          quantity_used: quantity
        });
        alert("Material erfolgreich aktualisiert!");
      } else {
        await MontageLeistungMaterial.create({
          montage_auftrag_id: montageAuftragId,
          material_id: selectedMaterial,
          quantity_used: quantity,
          usage_date: new Date().toISOString().split('T')[0],
          used_by: currentUser?.full_name || "",
          used_by_user_id: currentUser?.id || ""
        });
        alert("Material erfolgreich erfasst!");
      }
      onClose();
    } catch (error) {
      console.error("Fehler:", error);
      alert("Fehler beim Speichern des Materials");
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base">{editingMaterial ? "Material ändern" : "Material erfassen"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-sm">Material *</Label>
            <Input
              type="text"
              placeholder="Nach Material suchen..."
              value={searchMaterial}
              onChange={(e) => setSearchMaterial(e.target.value)}
              className="h-9 text-sm mb-2" />
            
            <Select value={selectedMaterial} onValueChange={setSelectedMaterial} required>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Material wählen..." />
              </SelectTrigger>
              <SelectContent className="max-h-[250px]">
                {materials.
                filter((mat) => mat.name.toLowerCase().includes(searchMaterial.toLowerCase()) || mat.article_number?.toLowerCase().includes(searchMaterial.toLowerCase())).
                map((mat) =>
                <SelectItem key={mat.id} value={mat.id} className="text-xs">
                    {mat.name} ({mat.current_stock} {mat.unit}) - {mat.article_number}
                  </SelectItem>
                )}
                {materials.filter((mat) => mat.name.toLowerCase().includes(searchMaterial.toLowerCase()) || mat.article_number?.toLowerCase().includes(searchMaterial.toLowerCase())).length === 0 &&
                <div className="text-xs text-gray-500 p-2">Keine Materialien gefunden</div>
                }
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
              className="h-9 text-sm" />
            
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none h-10">Abbrechen</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none h-10">{editingMaterial ? "Aktualisieren" : "Erfassen"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>);

}

export default function MontageLeistungenManagement({ montageAuftragId, readOnly = false, isMonteur = false, beweissicherungen = [], onReloadBeweissicherungen, hidePrices = false }) {
  const [leistungen, setLeistungen] = useState([]);
  const [materialUsage, setMaterialUsage] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [priceItems, setPriceItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingLeistung, setEditingLeistung] = useState(null);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [previewImages, setPreviewImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [leistungenOpen, setLeistungenOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [beweissicherungOpen, setBeweissicherungOpen] = useState(false);
  const [expandedLeistungId, setExpandedLeistungId] = useState(null);
  const [previewBewUrl, setPreviewBewUrl] = useState(null);
  const [editingBeweissicherung, setEditingBeweissicherung] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [leist, matUsage, mats, items] = await Promise.all([
      MontageLeistung.filter({ montage_auftrag_id: montageAuftragId }, 'created_date'),
      MontageLeistungMaterial.filter({ montage_auftrag_id: montageAuftragId }, 'created_date'),
      MontageMaterial.list(),
      MontagePreisItem.list()]
      );
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

  // Aggregiere Leistungen nach preis_item_id
  const aggregatedLeistungen = leistungen.reduce((acc, leistung) => {
    const existing = acc.find((l) => l.preis_item_id === leistung.preis_item_id);
    if (existing) {
      existing.quantity += leistung.quantity;
      existing.calculated_price += leistung.calculated_price || 0;
      existing.entries.push(leistung);
    } else {
      acc.push({
        ...leistung,
        entries: [leistung]
      });
    }
    return acc;
  }, []);

  const aggregatedTotalRevenue = aggregatedLeistungen.reduce((sum, l) => sum + (l.calculated_price || 0), 0);

  // Aggregiere Materialverbrauch nach material_id
  const aggregatedMaterialUsage = materialUsage.reduce((acc, usage) => {
    const existing = acc.find((m) => m.material_id === usage.material_id);
    if (existing) {
      existing.quantity_used += usage.quantity_used;
      existing.entries.push(usage);
    } else {
      acc.push({
        ...usage,
        entries: [usage]
      });
    }
    return acc;
  }, []);

  const [expandedMaterialId, setExpandedMaterialId] = useState(null);

  if (isLoading) {
    return <div className="p-8 text-center">Lädt...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Aktions-Buttons */}
      {!readOnly &&
      <div className="hidden md:flex gap-2 flex-wrap">
          <Button onClick={() => setShowForm(true)} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Leistung hinzufügen
          </Button>
          <Button onClick={() => setShowMaterialForm(true)} size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
            <Package className="w-4 h-4 mr-2" />
            Material hinzufügen
          </Button>
        </div>
      }
      


















      

      {/* Montagedokumentation - übergeordnete Box */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-700">
            <FileStack className="w-4 h-4 text-gray-500" />
            Montagedokumentation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-1">

          {/* Leistungen */}
          <Collapsible open={leistungenOpen} onOpenChange={setLeistungenOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <span className="text-sm flex items-center gap-2 text-gray-700">
                 <Wrench className="w-3.5 h-3.5 text-blue-500" />
                 Erfasste Leistungen ({aggregatedLeistungen.length})
                 



                  
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${leistungenOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-2 pb-2">
                {leistungen.length === 0 ?
                <div className="text-center py-4">
                    <p className="text-xs text-gray-400 mb-2">Noch keine Leistungen erfasst</p>
                    {!readOnly &&
                  <Button onClick={() => setShowForm(true)} size="sm" className="h-7 text-xs">
                        <Plus className="w-3 h-3 mr-1" /> Leistung erfassen
                      </Button>
                  }
                  </div> :

                <div className="space-y-1.5">
                     {aggregatedLeistungen.map((leistung, index) => {
                    const priceItem = priceItems.find((p) => p.id === leistung.preis_item_id);
                    const isExpanded = expandedLeistungId === leistung.id;
                    return (
                      <div key={leistung.id} className="border rounded-lg overflow-hidden bg-white">
                           <div
                          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setExpandedLeistungId(isExpanded ? null : leistung.id)}>
                          
                             <span className="text-xs text-gray-400 font-mono flex-shrink-0">#{index + 1}</span>
                             <div className="flex-1 min-w-0">
                               <p className="text-xs font-medium text-gray-900 truncate">{priceItem?.description || "Unbekannt"}</p>
                               <p className="text-[10px] text-gray-400">{priceItem?.item_number} · {leistung.quantity} {priceItem?.unit}</p>
                               {(() => {const totalPhotos = leistung.entries.reduce((s, e) => s + (e.photos?.length || 0), 0);return totalPhotos > 0 ? <span className="text-[10px] text-blue-500 flex items-center gap-0.5"><Camera className="w-2.5 h-2.5" />{totalPhotos} Foto{totalPhotos > 1 ? 's' : ''}</span> : null;})()}
                             </div>
                             
                             <ChevronDown className={`w-3 h-3 text-gray-300 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                           </div>
                           {isExpanded &&
                        <div className="border-t p-2.5 bg-gray-50 space-y-2 text-xs">
                               <div className="bg-blue-50 border border-blue-200 rounded p-2">
                                 <p className="font-semibold mb-2 text-blue-800">Zusammenfassung ({leistung.entries.length} Einträge):</p>
                                 <ul className="space-y-2">
                                   {leistung.entries.map((entry, i) =>
                              <li key={entry.id} className="p-2 bg-white rounded border border-blue-100 text-xs">
                                           <div className="flex items-center justify-between">
                                             <div>
                                               <div className="font-medium">{entry.quantity} {priceItem?.unit} - {entry.monteur_name || "Unbekannt"}</div>
                                               <div className="text-gray-500">{new Date(entry.completion_date).toLocaleDateString('de-DE')}</div>
                                               {entry.location_name && <div className="text-gray-500 mt-0.5">📍 {entry.location_name}</div>}
                                               {entry.work_description && <div className="text-gray-400 mt-0.5 italic">{entry.work_description}</div>}
                                             </div>
                                             {!readOnly &&
                                  <div className="flex gap-1 ml-2 flex-shrink-0">
                                                 <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => {e.stopPropagation();setEditingLeistung(entry);setShowForm(true);}}>
                                                   <Edit className="w-3 h-3 text-blue-600" />
                                                 </Button>
                                                 <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => {e.stopPropagation();handleDelete(entry.id);}}>
                                                   <Trash2 className="w-3 h-3 text-red-500" />
                                                 </Button>
                                               </div>
                                  }
                                           </div>
                                           {/* Fotos der Leistung */}
                                           {entry.photos && entry.photos.length > 0 &&
                                <div className="mt-2">
                                               <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-1"><Camera className="w-3 h-3" /> Fotos ({entry.photos.length})</p>
                                               <div className="grid grid-cols-4 gap-1">
                                                 {entry.photos.map((url, photoIdx) =>
                                    <div
                                      key={photoIdx}
                                      className="relative aspect-square cursor-pointer rounded overflow-hidden border border-gray-200 hover:border-blue-400 hover:scale-105 transition-all"
                                      onClick={(e) => {e.stopPropagation();setPreviewImages(entry.photos);setCurrentImageIndex(photoIdx);}}>
                                      
                                                     <img src={url} alt={`Foto ${photoIdx + 1}`} className="w-full h-full object-cover" />
                                                     {photoIdx === 3 && entry.photos.length > 4 &&
                                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">+{entry.photos.length - 4}</div>
                                      }
                                                   </div>
                                    )}
                                               </div>
                                             </div>
                                }
                                           {/* Einmaß-Skizzen */}
                                           {entry.einmass_skizze && entry.einmass_skizze.length > 0 &&
                                <div className="mt-2">
                                               <p className="text-[10px] text-amber-600 mb-1 flex items-center gap-1"><Camera className="w-3 h-3" /> Einmaß-Skizze ({entry.einmass_skizze.length})</p>
                                               <div className="grid grid-cols-4 gap-1">
                                                 {entry.einmass_skizze.map((url, skIdx) =>
                                    <div
                                      key={skIdx}
                                      className="relative aspect-square cursor-pointer rounded overflow-hidden border-2 border-amber-300 hover:border-amber-500 hover:scale-105 transition-all"
                                      onClick={(e) => {e.stopPropagation();setPreviewImages(entry.einmass_skizze);setCurrentImageIndex(skIdx);}}>
                                      
                                                     <img src={url} alt={`Skizze ${skIdx + 1}`} className="w-full h-full object-cover" />
                                                   </div>
                                    )}
                                               </div>
                                             </div>
                                }
                                         </li>
                              )}
                                     </ul>
                               </div>
                               {!readOnly &&
                          <div className="flex gap-1.5 pt-1 border-t">
                                   <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={(e) => {e.stopPropagation();setEditingLeistung(leistung.entries[0]);setShowForm(true);}}>
                                     <Edit className="w-3 h-3 mr-1" /> Bearbeiten
                                   </Button>
                                   <Button variant="outline" size="sm" className="h-6 text-xs px-2 text-red-600 border-red-200 hover:bg-red-50" onClick={(e) => {e.stopPropagation();leistung.entries.forEach((entry) => handleDelete(entry.id));}}>
                                     <Trash2 className="w-3 h-3 mr-1" /> Alle löschen
                                   </Button>
                                 </div>
                          }
                             </div>
                        }
                         </div>);

                  })}
                   </div>
                }
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="border-t border-gray-100" />

          {/* Materialverbrauch */}
          <Collapsible open={materialOpen} onOpenChange={setMaterialOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <span className="text-sm flex items-center gap-2 text-gray-700">
                  <Package className="w-3.5 h-3.5 text-purple-500" />
                  Materialverbrauch ({materialUsage.length})
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${materialOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-2 pb-2">
                {materialUsage.length === 0 ?
                <div className="text-center py-4">
                    <p className="text-xs text-gray-400 mb-2">Kein Material erfasst</p>
                    {!readOnly &&
                  <Button onClick={() => setShowMaterialForm(true)} size="sm" variant="outline" className="h-7 text-xs">
                        <Plus className="w-3 h-3 mr-1" /> Material hinzufügen
                      </Button>
                  }
                  </div> :

                <div className="space-y-1.5">
                     {aggregatedMaterialUsage.map((usage) => {
                    const material = materials.find((m) => m.id === usage.material_id);
                    const isExpanded = expandedMaterialId === usage.material_id;
                    return material ?
                    <div key={usage.material_id} className="border rounded-lg overflow-hidden bg-white">
                           <div
                        className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedMaterialId(isExpanded ? null : usage.material_id)}>
                        
                             <div className="flex-1 min-w-0">
                               <p className="font-medium text-xs text-gray-900">{material.name}</p>
                               <p className="text-[10px] text-gray-400">{material.article_number}</p>
                             </div>
                             <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                               <p className="font-bold text-xs text-gray-700">{usage.quantity_used} {material.unit}</p>
                               {usage.entries.length > 1 &&
                          <Badge variant="outline" className="text-[10px]">{usage.entries.length}x</Badge>
                          }
                               <ChevronDown className={`w-3 h-3 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                             </div>
                           </div>
                           {isExpanded &&
                      <div className="border-t p-2 bg-gray-50 space-y-2">
                               <ul className="space-y-1.5">
                                 {usage.entries.map((entry) =>
                          <li key={entry.id} className="flex items-center justify-between p-2 bg-white rounded border border-purple-100 text-xs">
                                     <div>
                                       <div className="font-medium">{entry.quantity_used} {material.unit}</div>
                                       <div className="text-gray-500">{entry.used_by || "Unbekannt"} · {entry.usage_date && new Date(entry.usage_date).toLocaleDateString('de-DE')}</div>
                                     </div>
                                     {!readOnly &&
                            <div className="flex gap-1 ml-2 flex-shrink-0">
                                         <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => {e.stopPropagation();setEditingMaterial(entry);setShowMaterialForm(true);}}>
                                           <Edit className="w-3 h-3 text-purple-600" />
                                         </Button>
                                         <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={async (e) => {e.stopPropagation();if (window.confirm("Löschen?")) {await MontageLeistungMaterial.delete(entry.id);loadData();}}}>
                                           <Trash2 className="w-3 h-3 text-red-500" />
                                         </Button>
                                       </div>
                            }
                                   </li>
                          )}
                               </ul>
                             </div>
                      }
                         </div> :
                    null;
                  })}
                   </div>
                }
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="border-t border-gray-100" />

          {/* Beweissicherungen */}
          <Collapsible open={beweissicherungOpen} onOpenChange={setBeweissicherungOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <span className="text-sm flex items-center gap-2 text-gray-700">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                  Beweissicherungen ({beweissicherungen.length})
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${beweissicherungOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-2 pb-2">
                {beweissicherungen.length === 0 ?
                <p className="text-xs text-gray-400 text-center py-4">Keine Beweissicherungen erfasst</p> :

                <div className="space-y-1">
                    {beweissicherungen.map((b) =>
                  <div key={b.id} className="p-2 bg-white border rounded text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-red-700">{b.schaediger_name}</p>
                          <div className="flex items-center gap-1">
                            {b.erfassungsdatum && <span className="text-gray-400">{new Date(b.erfassungsdatum).toLocaleDateString('de-DE')}</span>}
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setEditingBeweissicherung(b)}>
                              <Edit className="w-3 h-3 text-gray-500" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={async () => {if (window.confirm("Beweissicherung löschen?")) {await base44.entities.Beweissicherung.delete(b.id);onReloadBeweissicherungen && onReloadBeweissicherungen();}}}>
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        {b.schadensursache && <p className="text-gray-500">Ursache: {b.schadensursache}</p>}
                        {b.schadensort_strasse && <p className="text-gray-500">{b.schadensort_strasse}, {b.schadensort_plz} {b.schadensort_ort}</p>}
                        {b.fotos && b.fotos.length > 0 &&
                    <div className="flex gap-1 mt-1.5 overflow-x-auto">
                            {b.fotos.slice(0, 4).map((url, i) =>
                      <img key={i} src={url} alt={`Foto ${i + 1}`} className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80 flex-shrink-0" onClick={() => setPreviewBewUrl(url)} />
                      )}
                            {b.fotos.length > 4 && <span className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-500 flex-shrink-0">+{b.fotos.length - 4}</span>}
                          </div>
                    }
                      </div>
                  )}
                  </div>
                }
              </div>
            </CollapsibleContent>
          </Collapsible>

        </CardContent>
      </Card>

      {/* Beweissicherung Foto Vorschau */}
      {previewBewUrl &&
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4" onClick={() => setPreviewBewUrl(null)}>
          <img src={previewBewUrl} alt="Vorschau" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      }

      {/* Beweissicherung bearbeiten */}
      <AnimatePresence>
        {editingBeweissicherung &&
        <BeweissicherungDialog
          existingBeweissicherung={editingBeweissicherung}
          onClose={() => setEditingBeweissicherung(null)}
          onSave={() => {setEditingBeweissicherung(null);onReloadBeweissicherungen && onReloadBeweissicherungen();}} />

        }
      </AnimatePresence>

      <AnimatePresence>
        {showForm &&
        <MontageLeistungForm
          leistung={editingLeistung}
          montageAuftragId={montageAuftragId}
          onSubmit={handleSubmit}
          onCancel={() => {setShowForm(false);setEditingLeistung(null);}}
          onPreviewImages={(imgs, idx) => {setPreviewImages(imgs);setCurrentImageIndex(idx);}} />

        }
      </AnimatePresence>

      <AnimatePresence>
        {showMaterialForm &&
        <MaterialUsageDialog
          montageAuftragId={montageAuftragId}
          editingMaterial={editingMaterial}
          onClose={() => {setShowMaterialForm(false);setEditingMaterial(null);loadData();}} />

        }
      </AnimatePresence>

      {/* Image Viewer */}
      <AnimatePresence>
        {previewImages.length > 0 &&
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[300] p-4"
          onClick={() => setPreviewImages([])}>
          
            <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="relative max-w-4xl w-full max-h-[90vh] bg-black rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            
              {/* Image */}
              <div className="flex items-center justify-center h-[70vh] bg-black">
                <img
                src={previewImages[currentImageIndex]}
                alt={`Bild ${currentImageIndex + 1}`}
                className="max-w-full max-h-full object-contain" />
              
              </div>

              {/* Navigation */}
              <div className="absolute inset-0 flex items-center justify-between p-4 pointer-events-none">
                {currentImageIndex > 0 &&
              <button
                onClick={() => setCurrentImageIndex((prev) => prev - 1)}
                className="pointer-events-auto bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors">
                
                    <ChevronLeft className="w-6 h-6" />
                  </button>
              }
                {currentImageIndex < previewImages.length - 1 &&
              <button
                onClick={() => setCurrentImageIndex((prev) => prev + 1)}
                className="pointer-events-auto bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors ml-auto">
                
                    <ChevronRight className="w-6 h-6" />
                  </button>
              }
              </div>

              {/* Close button */}
              <button
              onClick={() => setPreviewImages([])}
              className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors">
              
                <X className="w-5 h-5" />
              </button>

              {/* Counter */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-center">
                <div className="bg-black/60 text-white px-3 py-2 rounded-lg text-sm">
                  {currentImageIndex + 1} / {previewImages.length}
                </div>
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}