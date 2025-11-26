import React, { useState, useEffect, useMemo } from 'react';
import { Material, City } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { X, Save, Cable } from "lucide-react";

// Farbpalette basierend auf dem hochgeladenen Bild
const COLOR_PALETTE = [
  // Erste Reihe
  { hex: '#FF0000', name: 'Rot' },
  { hex: '#90EE90', name: 'Hellgrün' },
  { hex: '#0000FF', name: 'Blau' },
  { hex: '#FFFF00', name: 'Gelb' },
  { hex: '#FFFFFF', name: 'Weiß' },
  { hex: '#808080', name: 'Grau' },
  { hex: '#8B4513', name: 'Braun' },
  { hex: '#800080', name: 'Lila' },
  { hex: '#00FFFF', name: 'Cyan' },
  { hex: '#000000', name: 'Schwarz' },
  { hex: '#FFA500', name: 'Orange' },
  // Zweite Reihe (hellere Varianten)
  { hex: '#FF8080', name: 'Hellrot' },
  { hex: '#C8F7C5', name: 'Sehr Hellgrün' },
  { hex: '#ADD8E6', name: 'Hellblau' },
  { hex: '#FFFF99', name: 'Hellgelb' },
  { hex: '#F5F5F5', name: 'Sehr Hellgrau' },
  { hex: '#D3D3D3', name: 'Hellgrau' },
  { hex: '#DEB887', name: 'Hellbraun' },
  { hex: '#DA70D6', name: 'Helllila' },
  { hex: '#E0FFFF', name: 'Hellcyan' },
  { hex: '#696969', name: 'Dunkelgrau' }
];

function ColorSelector({ selectedColors, onChange, disabled = false }) {
  const handleColorToggle = (colorHex) => {
    if (disabled) return;
    
    const newColors = selectedColors.includes(colorHex)
      ? selectedColors.filter(c => c !== colorHex)
      : [...selectedColors, colorHex];
    onChange(newColors);
  };

  return (
    <div className="space-y-3">
      <Label>Konnektierte Farben {!disabled && "(Mehrfachauswahl möglich)"}</Label>
      <div className="grid grid-cols-10 gap-2 p-4 bg-gray-50 rounded-lg">
        {COLOR_PALETTE.map((color) => (
          <button
            key={color.hex}
            type="button"
            onClick={() => handleColorToggle(color.hex)}
            disabled={disabled}
            className={`
              w-8 h-8 rounded border-2 transition-all duration-200 
              ${selectedColors.includes(color.hex) 
                ? 'border-black border-4 scale-110 shadow-lg' 
                : 'border-gray-300 hover:border-gray-500'
              }
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}
            `}
            style={{ backgroundColor: color.hex }}
            title={color.name}
          />
        ))}
      </div>
      {selectedColors.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedColors.map((colorHex) => {
            const color = COLOR_PALETTE.find(c => c.hex === colorHex);
            return (
              <div
                key={colorHex}
                className="flex items-center gap-2 bg-white px-2 py-1 rounded border text-sm"
              >
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: colorHex }}
                />
                <span>{color?.name || colorHex}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleColorToggle(colorHex)}
                    className="text-red-500 hover:text-red-700 ml-1"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PullingWorkForm({ pullingWork, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    location_name: '',
    street: '',
    house_number: '',
    postal_code: '',
    city: '',
    work_description: '',
    cable_type: '',
    cable_length: '',
    start_point: '',
    end_point: '',
    material_id: '',
    material_quantity: '',
    connected_colors: [],
    status: 'planned',
    foreman: 'Nicht zugewiesen',
    completion_date: '',
    notes: ''
  });

  const [materials, setMaterials] = useState([]);
  const [cities, setCities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (pullingWork) {
      setFormData({
        location_name: pullingWork.location_name || '',
        street: pullingWork.street || '',
        house_number: pullingWork.house_number || '',
        postal_code: pullingWork.postal_code || '',
        city: pullingWork.city || '',
        work_description: pullingWork.work_description || '',
        cable_type: pullingWork.cable_type || '',
        cable_length: pullingWork.cable_length || '',
        start_point: pullingWork.start_point || '',
        end_point: pullingWork.end_point || '',
        material_id: pullingWork.material_id || '',
        material_quantity: pullingWork.material_quantity || '',
        connected_colors: pullingWork.connected_colors || [],
        status: pullingWork.status || 'planned',
        foreman: pullingWork.foreman || 'Nicht zugewiesen',
        completion_date: pullingWork.completion_date || '',
        notes: pullingWork.notes || ''
      });
    }
  }, [pullingWork]);

  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    setIsLoading(true);
    try {
      const [materialsData, citiesData] = await Promise.all([
        Material.list().catch(() => []),
        City.list().catch(() => [])
      ]);
      setMaterials(Array.isArray(materialsData) ? materialsData : []);
      setCities(Array.isArray(citiesData) ? citiesData : []);
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error);
      setMaterials([]);
      setCities([]);
    }
    setIsLoading(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectedMaterial = useMemo(() => {
    if (!formData.material_id || !materials.length) return null;
    return materials.find(m => m.id === formData.material_id);
  }, [formData.material_id, materials]);

  const showColorSelector = selectedMaterial && (
    selectedMaterial.category === 'SNRVe' || 
    selectedMaterial.category === 'Mikro-Rohr'
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      cable_length: parseFloat(formData.cable_length) || 0,
      material_quantity: parseFloat(formData.material_quantity) || 0
    });
  };

  // Filter Materialien nach relevanten Kategorien
  const relevantMaterials = materials.filter(m => 
    m && ['SNRVe', 'Mikro-Rohr', 'Kabel'].includes(m.category)
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="card-elevation border-none">
          <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Cable className="w-5 h-5" />
              {pullingWork ? 'Einzieharbeit bearbeiten' : 'Neue Einzieharbeit'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel} className="text-white hover:bg-white/20">
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-6">
              {/* Standortinformationen */}
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg">Standortinformationen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Standortbezeichnung *</Label>
                    <Input 
                      value={formData.location_name} 
                      onChange={(e) => handleInputChange('location_name', e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Straße *</Label>
                      <Input 
                        value={formData.street} 
                        onChange={(e) => handleInputChange('street', e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hausnummer</Label>
                      <Input 
                        value={formData.house_number} 
                        onChange={(e) => handleInputChange('house_number', e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>PLZ</Label>
                      <Input 
                        value={formData.postal_code} 
                        onChange={(e) => handleInputChange('postal_code', e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Stadt *</Label>
                    <Select value={formData.city} onValueChange={(value) => handleInputChange('city', value)} required>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoading ? "Lade..." : "Stadt auswählen..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map(city => (
                          <SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Arbeitsdetails */}
              <Card className="bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-800">Arbeitsdetails</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Beschreibung der Arbeiten *</Label>
                    <Textarea 
                      value={formData.work_description} 
                      onChange={(e) => handleInputChange('work_description', e.target.value)} 
                      placeholder="Detaillierte Beschreibung der durchgeführten Einzieharbeiten..."
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Startpunkt</Label>
                      <Input 
                        value={formData.start_point} 
                        onChange={(e) => handleInputChange('start_point', e.target.value)} 
                        placeholder="z.B. Hausanschluss, KVz..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Endpunkt</Label>
                      <Input 
                        value={formData.end_point} 
                        onChange={(e) => handleInputChange('end_point', e.target.value)} 
                        placeholder="z.B. Verteilerschrank, Gebäude..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kabeltyp</Label>
                      <Input 
                        value={formData.cable_type} 
                        onChange={(e) => handleInputChange('cable_type', e.target.value)} 
                        placeholder="z.B. Glasfaser, Kupfer..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kabellänge (m)</Label>
                      <Input 
                        type="number" 
                        step="0.1" 
                        value={formData.cable_length} 
                        onChange={(e) => handleInputChange('cable_length', e.target.value)} 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Material und Farben */}
              <Card className="bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg text-green-800">Material und Konnektierung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Verwendetes Material</Label>
                      <Select 
                        value={formData.material_id} 
                        onValueChange={(value) => handleInputChange('material_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isLoading ? "Lade..." : "Material auswählen..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {relevantMaterials.map(material => (
                            <SelectItem key={material.id} value={material.id}>
                              <div className="flex items-center gap-2">
                                <span className="bg-gray-200 px-2 py-1 rounded text-xs">
                                  {material.category}
                                </span>
                                {material.name} ({material.article_number})
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Menge ({selectedMaterial?.unit || 'Einheit'})</Label>
                      <Input 
                        type="number" 
                        step="0.1" 
                        value={formData.material_quantity} 
                        onChange={(e) => handleInputChange('material_quantity', e.target.value)} 
                      />
                    </div>
                  </div>

                  {showColorSelector && (
                    <ColorSelector
                      selectedColors={formData.connected_colors}
                      onChange={(colors) => handleInputChange('connected_colors', colors)}
                    />
                  )}

                  {selectedMaterial && (
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-600">
                        <strong>Gewähltes Material:</strong> {selectedMaterial.name} 
                        <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {selectedMaterial.category}
                        </span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status und Zuordnung */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Geplant</SelectItem>
                      <SelectItem value="in_progress">In Arbeit</SelectItem>
                      <SelectItem value="completed">Abgeschlossen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Bauleiter</Label>
                  <Select value={formData.foreman} onValueChange={(value) => handleInputChange('foreman', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nicht zugewiesen">Nicht zugewiesen</SelectItem>
                      <SelectItem value="Sabri">Sabri</SelectItem>
                      <SelectItem value="Dogan">Dogan</SelectItem>
                      <SelectItem value="Ahmet">Ahmet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fertigstellungsdatum</Label>
                  <Input 
                    type="date" 
                    value={formData.completion_date} 
                    onChange={(e) => handleInputChange('completion_date', e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notizen</Label>
                <Textarea 
                  value={formData.notes} 
                  onChange={(e) => handleInputChange('notes', e.target.value)} 
                  placeholder="Zusätzliche Bemerkungen..."
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-end gap-3 bg-gray-50 rounded-b-lg">
              <Button type="button" variant="outline" onClick={onCancel}>
                Abbrechen
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}