import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { X, Loader2, ShieldAlert, Upload, Check, Trash2 } from "lucide-react";
import { UploadFile } from "@/integrations/Core";

export default function BeweissicherungDialog({ montageAuftragId, existingBeweissicherung, onClose, onSave }) {
  const isEdit = !!existingBeweissicherung;

  const [isLoading, setIsLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [formData, setFormData] = useState({
    schaediger_name: existingBeweissicherung?.schaediger_name || "",
    schaediger_adresse: existingBeweissicherung?.schaediger_adresse || "",
    schaediger_nummer: existingBeweissicherung?.schaediger_nummer || "",
    schadensort_plz: existingBeweissicherung?.schadensort_plz || "",
    schadensort_ort: existingBeweissicherung?.schadensort_ort || "",
    schadensort_strasse: existingBeweissicherung?.schadensort_strasse || "",
    schadensursache: existingBeweissicherung?.schadensursache || "",
    uhrzeit_schaden: existingBeweissicherung?.uhrzeit_schaden || "",
    uhrzeit_beseitigung: existingBeweissicherung?.uhrzeit_beseitigung || "",
    kabel_typ: existingBeweissicherung?.kabel_typ || "",
    kabel_geschuetzt: existingBeweissicherung?.kabel_geschuetzt ?? null,
    kabel_tiefe_cm: existingBeweissicherung?.kabel_tiefe_cm || "",
    fotos: existingBeweissicherung?.fotos || []
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (files) => {
    const filesToUpload = Array.from(files);
    setUploadingPhotos(true);
    try {
      const urls = [];
      for (const file of filesToUpload) {
        const { file_url } = await UploadFile({ file });
        urls.push(file_url);
      }
      setFormData(prev => ({ ...prev, fotos: [...prev.fotos, ...urls] }));
    } catch (error) {
      console.error("Upload Fehler:", error);
      alert("Fehler beim Hochladen der Fotos");
    }
    setUploadingPhotos(false);
  };

  const removePhoto = (index) => {
    setFormData(prev => ({ ...prev, fotos: prev.fotos.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    if (!formData.schaediger_name) {
      alert("Bitte den Namen des Schädigers angeben.");
      return;
    }
    setIsLoading(true);
    try {
      const dataToSave = { ...formData };
      if (dataToSave.kabel_tiefe_cm === '' || dataToSave.kabel_tiefe_cm === null) {
        delete dataToSave.kabel_tiefe_cm;
      }
      if (isEdit) {
        await base44.entities.Beweissicherung.update(existingBeweissicherung.id, dataToSave);
      } else {
        const user = await User.me();
        await base44.entities.Beweissicherung.create({
          montage_auftrag_id: montageAuftragId,
          ...dataToSave,
          erfasst_von: user.full_name,
          erfasst_von_user_id: user.id,
          erfassungsdatum: new Date().toISOString().split("T")[0]
        });
      }
      onSave();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern der Beweissicherung");
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-full h-full bg-white flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-400 border-b">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-white" />
            <h2 className="text-base font-bold text-white">
              {isEdit ? "Beweissicherung bearbeiten" : "Beweissicherung"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Schädiger */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 border-b pb-1">Schädiger</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-sm mb-1 block">Name *</Label>
                <Input
                  value={formData.schaediger_name}
                  onChange={(e) => handleChange("schaediger_name", e.target.value)}
                  placeholder="Name des Schädigers"
                />
              </div>
              <div>
                <Label className="text-sm mb-1 block">Adresse</Label>
                <Input
                  value={formData.schaediger_adresse}
                  onChange={(e) => handleChange("schaediger_adresse", e.target.value)}
                  placeholder="Straße, PLZ, Ort"
                />
              </div>
              <div>
                <Label className="text-sm mb-1 block">Telefonnummer</Label>
                <Input
                  value={formData.schaediger_nummer}
                  onChange={(e) => handleChange("schaediger_nummer", e.target.value)}
                  placeholder="+49 123 456789"
                  type="tel"
                />
              </div>
            </div>
          </div>

          {/* Schadensort */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 border-b pb-1">Schadensort</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm mb-1 block">PLZ</Label>
                  <Input
                    value={formData.schadensort_plz}
                    onChange={(e) => handleChange("schadensort_plz", e.target.value)}
                    placeholder="12345"
                  />
                </div>
                <div>
                  <Label className="text-sm mb-1 block">Ort</Label>
                  <Input
                    value={formData.schadensort_ort}
                    onChange={(e) => handleChange("schadensort_ort", e.target.value)}
                    placeholder="Stadt"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm mb-1 block">Straße</Label>
                <Input
                  value={formData.schadensort_strasse}
                  onChange={(e) => handleChange("schadensort_strasse", e.target.value)}
                  placeholder="Musterstraße 1"
                />
              </div>
            </div>
          </div>

          {/* Schadensdetails */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 border-b pb-1">Schadensdetails</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-sm mb-1 block">Schadensursache</Label>
                <Input
                  value={formData.schadensursache}
                  onChange={(e) => handleChange("schadensursache", e.target.value)}
                  placeholder="z.B. Bagger, Rakete, ..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm mb-1 block">Uhrzeit Schaden</Label>
                  <Input
                    type="time"
                    value={formData.uhrzeit_schaden}
                    onChange={(e) => handleChange("uhrzeit_schaden", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm mb-1 block">Uhrzeit Beseitigung</Label>
                  <Input
                    type="time"
                    value={formData.uhrzeit_beseitigung}
                    onChange={(e) => handleChange("uhrzeit_beseitigung", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Kabeldetails */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 border-b pb-1">Kabeldetails</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-sm mb-1 block">Welches Kabel ist defekt?</Label>
                <Input
                  value={formData.kabel_typ}
                  onChange={(e) => handleChange("kabel_typ", e.target.value)}
                  placeholder="z.B. 4-faser SM, 2x12 Minikabel, Cu-Kabel..."
                />
              </div>
              <div>
                <Label className="text-sm mb-1 block">Tiefe des Kabels (cm)</Label>
                <Input
                  type="number"
                  value={formData.kabel_tiefe_cm}
                  onChange={(e) => handleChange("kabel_tiefe_cm", e.target.value === '' ? null : parseFloat(e.target.value))}
                  placeholder="z.B. 60"
                />
              </div>
              <div>
                <Label className="text-sm mb-2 block">War das Kabel geschützt?</Label>
                <div className="flex gap-3">
                  {[{ val: true, label: 'Ja' }, { val: false, label: 'Nein' }].map(({ val, label }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleChange("kabel_geschuetzt", val)}
                      className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.kabel_geschuetzt === val
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Fotos */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 border-b pb-1">
              Fotos ({formData.fotos.length})
            </h3>
            <label className="block cursor-pointer mb-3">
              <div className="border-2 border-dashed border-orange-300 bg-orange-50 rounded-lg p-5 text-center hover:bg-orange-100 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                  className="hidden"
                />
                {uploadingPhotos ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                    <span className="text-sm text-orange-700">Wird hochgeladen...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                    <p className="text-sm font-medium text-gray-700">Fotos hochladen</p>
                    <p className="text-xs text-gray-500">Beliebig viele Fotos möglich</p>
                  </>
                )}
              </div>
            </label>
            {formData.fotos.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {formData.fotos.map((url, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover rounded-lg border" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex gap-3 bg-gray-50 rounded-b-xl">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || uploadingPhotos}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Wird gespeichert...</>
            ) : (
              <><Check className="w-4 h-4 mr-2" />{isEdit ? "Aktualisieren" : "Speichern"}</>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}