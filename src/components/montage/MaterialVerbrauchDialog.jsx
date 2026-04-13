import React, { useState, useEffect } from "react";
import { MontageLeistungMaterial, Material as MontageMaterial, User } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, X, Loader2, ChevronsUpDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export default function MaterialVerbrauchDialog({ montageAuftragId, onClose, onSave }) {
  const [materials, setMaterials] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [openCombo, setOpenCombo] = useState(null);
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
      const user = await User.me().catch(() => null);
      for (const material of selectedMaterials) {
        if (material.material_id) {
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
                                <Popover open={openCombo === index} onOpenChange={(open) => setOpenCombo(open ? index : null)}>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="mt-1 flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                    >
                                      <span className={cn("truncate", !item.material_id && "text-muted-foreground")}>
                                        {item.material_id
                                          ? materials.find(m => m.id === item.material_id)?.name || "Wählen..."
                                          : "Material wählen..."}
                                      </span>
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[min(360px,calc(100vw-2rem))] p-0" align="start">
                                    <Command>
                                      <CommandInput placeholder="Material suchen..." className="h-9" />
                                      <CommandEmpty>Kein Material gefunden.</CommandEmpty>
                                      <CommandGroup className="max-h-[280px] overflow-auto">
                                        {materials.map(mat => (
                                          <CommandItem
                                            key={mat.id}
                                            value={`${mat.name} ${mat.article_number || ""}`}
                                            onSelect={() => {
                                              updateMaterial(index, 'material_id', mat.id);
                                              setOpenCombo(null);
                                            }}
                                          >
                                            <Check className={cn("mr-2 h-4 w-4", item.material_id === mat.id ? "opacity-100" : "opacity-0")} />
                                            <div>
                                              <div className="text-sm font-medium">{mat.name}</div>
                                              <div className="text-xs text-gray-500">{mat.article_number} · {mat.unit}</div>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
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