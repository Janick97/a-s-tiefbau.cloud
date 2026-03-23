import React, { useState, useEffect } from "react";
import { MontageLeistungMaterial, MontageMaterial } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, X, Loader2 } from "lucide-react";

export default function MaterialVerbrauchDialog({ montageAuftragId, onClose, onSave }) {
  const [materials, setMaterials] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      const data = await MontageMaterial.list();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fehler beim Laden der Materialien:', error);
    }
    setIsLoading(false);
  };

  const addMaterial = () => {
    setSelectedMaterials([
    ...selectedMaterials,
    { material_id: '', quantity: 1 }]
    );
  };

  const removeMaterial = (index) => {
    setSelectedMaterials(selectedMaterials.filter((_, i) => i !== index));
  };

  const updateMaterial = (index, field, value) => {
    const updated = [...selectedMaterials];
    updated[index][field] = value;
    setSelectedMaterials(updated);
  };

  const handleSave = async () => {
    if (selectedMaterials.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      for (const material of selectedMaterials) {
        if (material.material_id) {
          const user = await import('@/api/base44Client').then((m) => m.base44.auth.me()).catch(() => null);
          await MontageLeistungMaterial.create({
            montage_auftrag_id: montageAuftragId,
            material_id: material.material_id,
            quantity_used: material.quantity,
            usage_date: new Date().toISOString().split('T')[0],
            used_by: user?.full_name || 'Monteur',
            used_by_user_id: user?.id || '',
            notes: material.notes || ''
          });
        }
      }
      onSave();
    } catch (error) {
      console.error('Fehler beim Speichern des Materials:', error);
      alert('Fehler beim Speichern des Materials');
    }
    setIsSaving(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full h-full"
          onClick={(e) => e.stopPropagation()}>
          
          <Card className="border-none h-full rounded-none flex flex-col">
            <CardHeader className="bg-slate-400 text-white p-6 flex flex-col space-y-1.5 from-purple-500 to-indigo-600">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  🧰 Material verbraucht
                </CardTitle>
                <button onClick={onClose} className="hover:bg-white/20 p-1 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              

              
            </CardHeader>

            <CardContent className="p-6 flex-1 overflow-y-auto">
              {isLoading ?
              <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div> :

              <div className="space-y-4">
                  {selectedMaterials.length === 0 ?
                <div className="text-center py-8 text-gray-500">
                      <p className="mb-4">Noch kein Material hinzugefügt</p>
                      <Button onClick={addMaterial} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Erstes Material hinzufügen
                      </Button>
                    </div> :

                <>
                      <div className="space-y-3">
                        {selectedMaterials.map((item, index) =>
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-4 rounded-lg border border-gray-200 bg-gray-50 space-y-3">
                      
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs font-medium text-gray-600">Material</Label>
                                <Select
                            value={item.material_id}
                            onValueChange={(value) => updateMaterial(index, 'material_id', value)}>
                            
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Wählen Sie Material..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {materials.map((mat) =>
                              <SelectItem key={mat.id} value={mat.id}>
                                        {mat.name} ({mat.unit})
                                      </SelectItem>
                              )}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="text-xs font-medium text-gray-600">Verbrauchte Menge</Label>
                                <Input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={item.quantity}
                            onChange={(e) => updateMaterial(index, 'quantity', parseFloat(e.target.value))}
                            className="mt-1"
                            placeholder="0" />
                          
                              </div>

                              <div className="flex items-end">
                                <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeMaterial(index)}
                            className="w-full h-9">
                            
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Entfernen
                                </Button>
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs font-medium text-gray-600">Notizen (optional)</Label>
                              <Input
                          value={item.notes || ''}
                          onChange={(e) => updateMaterial(index, 'notes', e.target.value)}
                          placeholder="z.B. Verschnitt beachtet, beschädigt..."
                          className="mt-1 text-sm" />
                        
                            </div>
                          </motion.div>
                    )}
                      </div>

                      <Button
                    onClick={addMaterial}
                    variant="outline"
                    className="w-full">
                    
                        <Plus className="w-4 h-4 mr-2" />
                        Weiteres Material hinzufügen
                      </Button>
                    </>
                }
                </div>
              }
            </CardContent>

            <div className="border-t p-6 flex gap-3 justify-end bg-gray-50">
              <Button
                variant="outline"
                onClick={onClose}>
                
                Abbrechen
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700">
                
                {isSaving ?
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird gespeichert...
                  </> :

                <>
                    ✓ Speichern & Fertig
                  </>
                }
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>);

}