import React, { useState, useEffect } from "react";
import { MontageLeistung, MontagePreisItem, MontageMaterialInventory, User } from "@/entities/all";
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

  const [allMonteure, setAllMonteure] = useState([]);

  const [leistungsoptionen, setLeistungsoptionen] = useState([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [searchLeistung, setSearchLeistung] = useState("");

  useEffect(() => {
    loadLeistungsoptionen();
    loadAllMonteure();
  }, []);

  const loadAllMonteure = async () => {
    try {
      const users = await User.list();
      const monteurs = users.filter(u => u.position === 'Monteur');
      setAllMonteure(monteurs);
    } catch (error) {
      console.error('Fehler beim Laden der Monteure:', error);
    }
  };

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

  const handleGetLocation = async () => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Reverse Geocoding via Nominatim (OpenStreetMap)
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
              { headers: { 'Accept-Language': 'de' } }
            );
            const data = await response.json();
            const address = data.address?.road ? `${data.address.road} ${data.address.house_number || ''}` : data.display_name.split(',')[0];
            
            setFormData(prev => ({
              ...prev,
              latitude: lat,
              longitude: lng,
              standortName: address.trim()
            }));
          } catch (error) {
            console.log('Reverse Geocoding fehlgeschlagen:', error);
            setFormData(prev => ({
              ...prev,
              latitude: lat,
              longitude: lng
            }));
          }
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
      // Get monteur IDs (single user if alleine, or selected users)
      const monteurIds = formData.alleineArbeiten === 'ja' 
        ? [] 
        : formData.mitarbeiterIds;
      
      const monteurCount = monteurIds.length > 0 ? monteurIds.length : 1;
      
      // Save MontageLeistung records, split among monteurs
      for (const leistung of formData.leistungen) {
        const quantityPerMonteur = leistung.quantity / monteurCount;
        
        if (monteurIds.length > 0) {
          // Multiple monteurs - create entry for each
          for (const monteurId of monteurIds) {
            const monteurData = allMonteure.find(m => m.id === monteurId);
            await MontageLeistung.create({
              montage_auftrag_id: montageAuftragId,
              preis_item_id: leistung.id,
              quantity: quantityPerMonteur,
              location_name: formData.standortName,
              monteur_name: monteurData?.full_name || 'Monteur',
              monteur_user_id: monteurId,
              completion_date: new Date().toISOString().split('T')[0],
              work_description: formData.notizen,
              photos: formData.fotos,
              einmass_skizze: formData.einmassSkizzen
            });
          }
        } else {
          // Single monteur (alleine)
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full h-full md:h-auto md:max-w-4xl bg-white md:rounded-xl shadow-2xl flex flex-col"
      >
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b p-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{WIZARD_STEPS[currentStep].icon}</span>
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">{WIZARD_STEPS[currentStep].title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Schritt {currentStep + 1} von {WIZARD_STEPS.length}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
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

                {formData.alleineArbeiten === 'nein' && allMonteure.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Wählen Sie Ihre Mitarbeiter:</Label>
                    <div className="space-y-2">
                      {allMonteure.map(monteur => (
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
                <div>
                  <p className="text-sm text-gray-600 mb-3">Wählen Sie durchgeführte Leistungen und geben Sie die Menge ein:</p>
                  <Input
                    placeholder="Nach Position suchen..."
                    value={searchLeistung}
                    onChange={(e) => setSearchLeistung(e.target.value)}
                    className="h-10 mb-4"
                  />
                </div>
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                  {leistungsoptionen
                    .filter(leistung =>
                      leistung.description.toLowerCase().includes(searchLeistung.toLowerCase()) ||
                      leistung.item_number.toLowerCase().includes(searchLeistung.toLowerCase())
                    )
                    .map(leistung => {
                    const selected = formData.leistungen.find(l => l.id === leistung.id);
                    return (
                      <motion.div
                        key={leistung.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        onClick={() => {
                          if (!selected) handleLeistungToggle(leistung.id, 1);
                          else handleLeistungToggle(leistung.id, 0);
                        }}
                      >
                        <Checkbox
                          checked={!!selected}
                          onCheckedChange={(checked) => {
                            if (!checked) handleLeistungToggle(leistung.id, 0);
                            else handleLeistungToggle(leistung.id, 1);
                          }}
                          className="flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{leistung.description}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{leistung.unit}</p>
                        </div>
                        {selected && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-500">Menge:</span>
                            <Input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={selected.quantity}
                              onChange={(e) => handleLeistungToggle(leistung.id, parseFloat(e.target.value))}
                              className="w-16 h-9 text-sm"
                            />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  {leistungsoptionen.filter(l => l.description.toLowerCase().includes(searchLeistung.toLowerCase()) || l.item_number.toLowerCase().includes(searchLeistung.toLowerCase())).length === 0 && searchLeistung && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">Keine Leistungen gefunden</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Standort & GPS */}
            {currentStep === 3 && (
              <motion.div key="standort" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div>
                  <Label className="text-base font-semibold mb-2 block">Standortbezeichnung</Label>
                  <Input
                    value={formData.standortName}
                    onChange={(e) => setFormData({ ...formData, standortName: e.target.value })}
                    placeholder="z.B. Haus Nr. 42, Kellerraum"
                    className="h-10 text-base"
                  />
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-semibold">GPS-Standort</Label>
                    <Button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={isGettingLocation}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-9"
                    >
                      {isGettingLocation ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Wird ermittelt...
                        </>
                      ) : (
                        <>
                          <Navigation className="w-4 h-4 mr-2" />
                          GPS aktivieren
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600 mb-2 block">Breitengrad</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={formData.latitude || ''}
                        onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                        placeholder="z.B. 52.5200"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600 mb-2 block">Längengrad</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={formData.longitude || ''}
                        onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                        placeholder="z.B. 13.4050"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-2 block">Notizen zur Montagestelle</Label>
                  <Textarea
                    value={formData.notizen}
                    onChange={(e) => setFormData({ ...formData, notizen: e.target.value })}
                    placeholder="Besonderheiten, Probleme, Beobachtungen..."
                    className="h-32 resize-none"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 4: Dokumente */}
            {currentStep === 4 && (
              <motion.div key="dokumente" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div>
                  <Label className="text-base font-semibold mb-3 block">Einmaß-Skizzen</Label>
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-8 text-center hover:bg-blue-100 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={(e) => handleFileUpload(Array.from(e.target.files), 'einmassSkizzen')}
                        className="hidden"
                      />
                      <p className="text-sm font-medium text-gray-900">Dateien hochladen</p>
                      <p className="text-xs text-gray-600 mt-1">Bilder oder PDF-Dateien</p>
                    </div>
                  </label>
                  {uploadProgress.einmassSkizzen && (
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Upload läuft...</span>
                        <span>{uploadProgress.einmassSkizzen.current}/{uploadProgress.einmassSkizzen.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                          initial={{ width: '0%' }}
                          animate={{ width: `${(uploadProgress.einmassSkizzen.current / uploadProgress.einmassSkizzen.total) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}
                  {formData.einmassSkizzen.length > 0 && (
                    <p className="text-sm text-green-600 mt-3 font-medium">✓ {formData.einmassSkizzen.length} Skizze(n) hochgeladen</p>
                  )}
                </div>

                <div>
                  <Label className="text-base font-semibold mb-3 block">Fotos</Label>
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-purple-300 bg-purple-50 rounded-lg p-8 text-center hover:bg-purple-100 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleFileUpload(Array.from(e.target.files), 'fotos')}
                        className="hidden"
                      />
                      <p className="text-sm font-medium text-gray-900">Dateien hochladen</p>
                      <p className="text-xs text-gray-600 mt-1">JPG, PNG oder ähnliche Formate</p>
                    </div>
                  </label>
                  {uploadProgress.fotos && (
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Upload läuft...</span>
                        <span>{uploadProgress.fotos.current}/{uploadProgress.fotos.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          className="bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full"
                          initial={{ width: '0%' }}
                          animate={{ width: `${(uploadProgress.fotos.current / uploadProgress.fotos.total) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}
                  {formData.fotos.length > 0 && (
                    <p className="text-sm text-green-600 mt-3 font-medium">✓ {formData.fotos.length} Foto(s) hochgeladen</p>
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
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex gap-3 justify-between bg-gray-50 md:rounded-b-lg mt-auto">
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