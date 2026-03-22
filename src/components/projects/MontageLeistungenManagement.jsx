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
import { Plus, Edit, Trash2, Camera, X, Wrench, Check, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronDown, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadFile } from "@/integrations/Core";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function MontageLeistungForm({ leistung, montageAuftragId, onSubmit, onCancel }) {
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
    <Dialog open={!showContinueDialog} onOpenChange={onCancel}>
      <DialogContent className="w-screen h-screen sm:max-w-2xl sm:max-h-[95vh] sm:w-auto sm:h-auto max-w-none max-h-none sm:rounded-lg rounded-none overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg sm:text-base">{leistung ? "Bearbeiten" : "Neue Leistung"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-3 pb-20 sm:pb-0">
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
                                className="w-full justify-between h-9 text-xs">
                                
                              {selectedPriceItem ?
                                <span className="truncate">{selectedPriceItem.item_number} - {selectedPriceItem.description}</span> :

                                "Position suchen..."
                                }
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
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
                  {uploading ? "Lädt..." : `Fotos (${sharedData.photos?.length || 0})`}
                </span>
              </Button>
            </label>
            {sharedData.photos && sharedData.photos.length > 0 &&
              <div className="mt-2 grid grid-cols-4 gap-1">
                {sharedData.photos.map((url, idx) =>
                <div key={idx} className="relative">
                    <img src={url} alt={`${idx + 1}`} className="w-full h-16 object-cover rounded" />
                    <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0"
                    onClick={() => removePhoto(url)}>
                    
                      <X className="h-3 h-3" />
                    </Button>
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
                  {uploading ? "Lädt..." : `Einmaß-Skizze (${sharedData.einmass_skizze?.length || 0})`}
                </span>
              </Button>
            </label>
            {sharedData.einmass_skizze && sharedData.einmass_skizze.length > 0 &&
              <div className="mt-2 grid grid-cols-4 gap-1">
                {sharedData.einmass_skizze.map((url, idx) =>
                <div key={idx} className="relative">
                    <img src={url} alt={`Skizze ${idx + 1}`} className="w-full h-16 object-cover rounded border-2 border-amber-300" />
                    <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0"
                    onClick={() => removeSkizze(url)}>
                    
                      <X className="h-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              }
          </div>

          <DialogFooter className="gap-2 sm:gap-0 fixed sm:relative bottom-0 left-0 right-0 p-4 bg-white border-t sm:border-0 sm:p-0">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none h-12 sm:h-10 text-base sm:text-sm">Abbrechen</Button>
            <Button type="submit" disabled={uploading} className="flex-1 sm:flex-none bg-blue-600 h-12 sm:h-10 text-base sm:text-sm">
              {leistung ? "Aktualisieren" : "Weiter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

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
              className="h-9 text-sm mb-2"
            />
            <Select value={selectedMaterial} onValueChange={setSelectedMaterial} required>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Material wählen..." />
              </SelectTrigger>
              <SelectContent className="max-h-[250px]">
                {materials
                  .filter(mat => mat.name.toLowerCase().includes(searchMaterial.toLowerCase()) || mat.article_number?.toLowerCase().includes(searchMaterial.toLowerCase()))
                  .map((mat) =>
                <SelectItem key={mat.id} value={mat.id} className="text-xs">
                    {mat.name} ({mat.current_stock} {mat.unit}) - {mat.article_number}
                  </SelectItem>
                )}
                {materials.filter(mat => mat.name.toLowerCase().includes(searchMaterial.toLowerCase()) || mat.article_number?.toLowerCase().includes(searchMaterial.toLowerCase())).length === 0 && (
                  <div className="text-xs text-gray-500 p-2">Keine Materialien gefunden</div>
                )}
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

export default function MontageLeistungenManagement({ montageAuftragId, readOnly = false, isMonteur = false }) {
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
  const [expandedLeistungId, setExpandedLeistungId] = useState(null);

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

  if (isLoading) {
    return <div className="p-8 text-center">Lädt...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Aktions-Buttons */}
      {!readOnly && (
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
      )}
      


















      

      {/* Materialverbrauch - kompakt */}
      {materialUsage.length > 0 &&
      <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Materialverbrauch ({materialUsage.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-1.5">
              {materialUsage.map((usage) => {
              const material = materials.find((m) => m.id === usage.material_id);
              return material ?
              <div key={usage.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{material.name}</p>
                      <p className="text-gray-600">{material.article_number}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <div className="text-right">
                        <p className="font-bold">{usage.quantity_used} {material.unit}</p>
                      </div>
                      {!readOnly && (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {setEditingMaterial(usage);setShowMaterialForm(true);}}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={async () => {if (window.confirm("Löschen?")) {await MontageLeistungMaterial.delete(usage.id);loadData();}}}>
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div> :
              null;
            })}
            </div>
          </CardContent>
        </Card>
      }

      {/* Leistungen - kompakt */}
      {leistungen.length === 0 ?
      <Card className="border-none">
          <CardContent className="p-8 text-center">
            <Wrench className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <h3 className="text-base font-medium text-gray-500 mb-2">Noch keine Leistungen</h3>
            {!readOnly &&
          <Button onClick={() => setShowForm(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Erste Leistung erfassen
              </Button>
          }
          </CardContent>
        </Card> :

      <div className="space-y-2">
          {leistungen.map((leistung, index) => {
          const priceItem = priceItems.find((p) => p.id === leistung.preis_item_id);
          return (
            <motion.div
              key={leistung.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}>
              
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono text-xs">
                            #{index + 1}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-sm text-gray-900 line-clamp-2">{priceItem?.description || "Unbekannt"}</h4>
                        <p className="text-xs text-gray-500 font-mono">{priceItem?.item_number}</p>
                      </div>
                      {!readOnly &&
                    <div className="flex gap-1 flex-shrink-0">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {setEditingLeistung(leistung);setShowForm(true);}}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(leistung.id)}>
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                    }
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
                      {leistung.location_name &&
                    <div className="col-span-2">
                          <span className="text-gray-600">Standort: </span>
                          <span className="font-medium">{leistung.location_name}</span>
                        </div>
                    }
                      {leistung.monteur_name &&
                    <div className="col-span-2 pt-1 border-t">
                          <span className="text-gray-600">Erfasst von: </span>
                          <span className="font-medium text-blue-600">{leistung.monteur_name}</span>
                        </div>
                    }
                      {leistung.completion_date &&
                    <div className="col-span-2">
                          <span className="text-gray-600">Datum: </span>
                          <span className="font-medium">{new Date(leistung.completion_date).toLocaleDateString('de-DE')}</span>
                        </div>
                    }
                    </div>

                    {leistung.work_description &&
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <p className="text-gray-700 line-clamp-2">{leistung.work_description}</p>
                      </div>
                  }

                    {leistung.photos && leistung.photos.length > 0 &&
                  <div className="mt-2 flex gap-1 overflow-x-auto">
                        {leistung.photos.slice(0, 4).map((url, idx) =>
                    <img key={idx} src={url} alt={`Foto ${idx + 1}`} className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 flex-shrink-0" onClick={() => {setPreviewImages(leistung.photos);setCurrentImageIndex(idx);}} />
                    )}
                        {leistung.photos.length > 4 &&
                    <button onClick={() => {setPreviewImages(leistung.photos);setCurrentImageIndex(0);}} className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-600 flex-shrink-0 hover:bg-gray-200">
                            +{leistung.photos.length - 4}
                          </button>
                    }
                      </div>
                  }
                  </CardContent>
                </Card>
              </motion.div>);

        })}
        </div>
      }

      <AnimatePresence>
        {showForm &&
        <MontageLeistungForm
          leistung={editingLeistung}
          montageAuftragId={montageAuftragId}
          onSubmit={handleSubmit}
          onCancel={() => {setShowForm(false);setEditingLeistung(null);}} />

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
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
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