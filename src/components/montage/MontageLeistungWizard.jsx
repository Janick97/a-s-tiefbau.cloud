import React, { useState, useEffect } from "react";
import { MontageLeistung, MontagePreisItem, MontageMaterialInventory } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, MapPin, Check, AlertCircle, Loader2, Navigation } from "lucide-react";
import { UploadFile } from "@/integrations/Core";

const WIZARD_STEPS = [
  { id: 'kategorie', title: 'Kategorie wählen', icon: '📡' },
  { id: 'team', title: 'Team & Monteure', icon: '👥' },
  { id: 'leistungen', title: 'Leistungen', icon: '🔧' },
  { id: 'standort', title: 'Standort & GPS', icon: '📍' },
  { id: 'dokumente', title: 'Dokumente', icon: '📸' },
  { id: 'overview', title: 'Übersicht', icon: '✓' }
];

export default function MontageLeistungWizard({ montageAuftragId, availableMonteure, onComplete, onCancel }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    kategorie: '',
    alleineArbeiten: 'ja',
    mitarbeiterIds: [],
    leistungen: [],
    standortName: '',
    latitude: null,
    longitude: null,
    notizen: '',
    fotos: [],
    einmassSkizzen: []
  });

  const [leistungsoptionen, setLeistungsoptionen] = useState([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  useEffect(() => {
    loadLeistungsoptionen();
  }, []);

  const loadLeistungsoptionen = async () => {
    try {
      const leistungen = await MontagePreisItem.list();
      setLeistungsoptionen(Array.isArray(leistungen) ? leistungen : []);
    } catch (error) {
      console.error('Fehler beim Laden der Leistungen:', error);
    }
  };

  const handleFileUpload = async (files, type) => {
    try {
      const uploadedUrls = [];
      const totalFiles = files.length;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => ({ ...prev, [type]: { current: i + 1, total: totalFiles } }));
        
        const { file_url } = await UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      
      setFormData(prev => ({
        ...prev,
        [type]: [...(prev[type] || []), ...uploadedUrls]
      }));
      
      setUploadProgress(prev => ({ ...prev, [type]: null }));
    } catch (error) {
      console.error('Fehler beim Upload:', error);
      alert('Fehler beim Upload der Datei');
      setUploadProgress(prev => ({ ...prev, [type]: null }));
    }
  };

  const handleGetLocation = () => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
          setIsGettingLocation(false);
        },
        (error) => {
          console.log('GPS nicht verfügbar:', error);
          alert('GPS-Standort konnte nicht ermittelt werden');
          setIsGettingLocation(false);
        }
      );
    } else {
      alert('GPS ist nicht verfügbar');
      setIsGettingLocation(false);
    }
  };

  const handleLeistungToggle = (leistungId, quantity) => {
    setFormData(prev => {
      const existingIndex = prev.leistungen.findIndex(l => l.id === leistungId);
      if (existingIndex >= 0) {
        const newLeistungen = [...prev.leistungen];
        newLeistungen[existingIndex].quantity = quantity || 0;
        if (quantity === 0) newLeistungen.splice(existingIndex, 1);
        return { ...prev, leistungen: newLeistungen };
      }
      return {
        ...prev,
        leistungen: [...prev.leistungen, { id: leistungId, quantity: quantity || 1 }]
      };
    });
  };

  const handleMonteurToggle = (monteurId) => {
    setFormData(prev => {
      const exists = prev.mitarbeiterIds.includes(monteurId);
      return {
        ...prev,
        mitarbeiterIds: exists 
          ? prev.mitarbeiterIds.filter(id => id !== monteurId)
          : [...prev.mitarbeiterIds, monteurId]
      };
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return formData.kategorie !== '';
      case 1: return formData.alleineArbeiten === 'ja' || formData.mitarbeiterIds.length > 0;
      case 2: return formData.leistungen.length > 0;
      case 3: return formData.latitude && formData.longitude;
      default: return true;
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Save MontageLeistung records
      for (const leistung of formData.leistungen) {
        await MontageLeistung.create({
          montage_auftrag_id: montageAuftragId,
          preis_item_id: leistung.id,
          quantity: leistung.quantity,
          location_name: formData.standortName,
          monteur_name: 'Monteur',
          monteur_user_id: 'auto',
          completion_date: new Date().toISOString().split('T')[0],
          work_description: formData.notizen,
          photos: formData.fotos,
          einmass_skizze: formData.einmassSkizzen
        });
      }
      
      setIsLoading(false);
      onComplete(formData);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern der Leistungen');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl"
      >
        {/* Progress Bar */}
        <div className="h-2 bg-gray-200">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Header */}
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{WIZARD_STEPS[currentStep].icon}</span>
            <div>
              <CardTitle>{WIZARD_STEPS[currentStep].title}</CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                Schritt {currentStep + 1} von {WIZARD_STEPS.length}
              </p>
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-6 min-h-[400px]">
          <AnimatePresence mode="wait">
            {/* Step 0: Kategorie */}
            {currentStep === 0 && (
              <motion.div key="kategorie" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <p className="text-gray-600 mb-4">Wählen Sie die Art der Montagearbeit:</p>
                <div className="grid grid-cols-2 gap-3">
                  {['Glasfaser', 'Kupfer'].map(kat => (
                    <button
                      key={kat}
                      onClick={() => setFormData({ ...formData, kategorie: kat })}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.kategorie === kat
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{kat}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 1: Team */}
            {currentStep === 1 && (
              <motion.div key="team" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <Label className="text-base font-semibold">Arbeiten Sie alleine oder mit anderen Monteuren?</Label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {['ja', 'nein'].map(option => (
                    <button
                      key={option}
                      onClick={() => setFormData({ ...formData, alleineArbeiten: option })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.alleineArbeiten === option
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      {option === 'ja' ? 'Alleine' : 'Mit anderen'}
                    </button>
                  ))}
                </div>

                {formData.alleineArbeiten === 'nein' && availableMonteure.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Wählen Sie Ihre Mitarbeiter:</Label>
                    <div className="space-y-2">
                      {availableMonteure.map(monteur => (
                        <div key={monteur.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.mitarbeiterIds.includes(monteur.id)}
                            onCheckedChange={() => handleMonteurToggle(monteur.id)}
                          />
                          <label className="text-sm cursor-pointer">{monteur.full_name}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Leistungen */}
            {currentStep === 2 && (
              <motion.div key="leistungen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">Wählen Sie durchgeführte Leistungen und geben Sie Stückzahl ein:</p>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {leistungsoptionen.map(leistung => {
                    const selected = formData.leistungen.find(l => l.id === leistung.id);
                    return (
                      <div key={leistung.id} className="flex items-center gap-3 p-2 rounded-lg border border-gray-200">
                        <Checkbox
                          checked={!!selected}
                          onCheckedChange={(checked) => {
                            if (!checked) handleLeistungToggle(leistung.id, 0);
                            else handleLeistungToggle(leistung.id, 1);
                          }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{leistung.name}</p>
                          <p className="text-xs text-gray-500">{leistung.unit}</p>
                        </div>
                        {selected && (
                          <Input
                            type="number"
                            min="1"
                            value={selected.quantity}
                            onChange={(e) => handleLeistungToggle(leistung.id, parseInt(e.target.value))}
                            className="w-16 h-8 text-sm"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 3: Standort & GPS */}
            {currentStep === 3 && (
              <motion.div key="standort" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div>
                  <Label>Standortbezeichnung</Label>
                  <Input
                    value={formData.standortName}
                    onChange={(e) => setFormData({ ...formData, standortName: e.target.value })}
                    placeholder="z.B. Haus Nr. 42, Kellerraum"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">GPS Breite</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={formData.latitude || ''}
                      onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                      placeholder="z.B. 52.5200"
                      className="text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">GPS Länge</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={formData.longitude || ''}
                      onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                      placeholder="z.B. 13.4050"
                      className="text-sm mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Notizen zur Montagestelle</Label>
                  <Textarea
                    value={formData.notizen}
                    onChange={(e) => setFormData({ ...formData, notizen: e.target.value })}
                    placeholder="Besonderheiten, Probleme, Observations..."
                    className="mt-1 h-24"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 4: Dokumente */}
            {currentStep === 4 && (
              <motion.div key="dokumente" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div>
                  <Label className="block mb-2">Einmaß-Skizzen hochladen</Label>
                  <label className="block">
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(Array.from(e.target.files), 'einmassSkizzen')}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </label>
                  {formData.einmassSkizzen.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">✓ {formData.einmassSkizzen.length} Skizze(n) hochgeladen</p>
                  )}
                </div>

                <div>
                  <Label className="block mb-2">Fotos hochladen</Label>
                  <label className="block">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleFileUpload(Array.from(e.target.files), 'fotos')}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </label>
                  {formData.fotos.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">✓ {formData.fotos.length} Foto(s) hochgeladen</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 5: Overview */}
            {currentStep === 5 && (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs text-gray-500">Kategorie</p>
                    <p className="font-semibold text-gray-900">{formData.kategorie}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs text-gray-500">Monteure</p>
                    <p className="font-semibold text-gray-900">
                      {formData.alleineArbeiten === 'ja' ? 'Alleine' : `Mit ${formData.mitarbeiterIds.length} weiteren Monteur(en)`}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs text-gray-500">Leistungen</p>
                    <p className="font-semibold text-gray-900">{formData.leistungen.length} Leistung(en)</p>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs text-gray-500">Standort</p>
                    <p className="font-semibold text-gray-900 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {formData.standortName || 'Nicht angegeben'} ({formData.latitude?.toFixed(4)}, {formData.longitude?.toFixed(4)})
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs text-gray-500">Dokumente</p>
                    <p className="font-semibold text-gray-900">{formData.einmassSkizzen.length} Skizzen, {formData.fotos.length} Fotos</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        {/* Footer */}
        <div className="border-t p-6 flex gap-3 justify-between bg-gray-50">
          <Button
            variant="outline"
            onClick={() => currentStep === 0 ? onCancel() : setCurrentStep(currentStep - 1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 0 ? 'Abbrechen' : 'Zurück'}
          </Button>

          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Weiter
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Leistung erfassen
                </>
              )}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}