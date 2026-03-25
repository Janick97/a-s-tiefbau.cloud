import React, { useState, useEffect } from "react";
import { User, VehicleMaintenance } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, Check, AlertCircle, Camera, Loader2, Calendar, ChevronRight, ChevronLeft, Car, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

const PREFIX = "DN-AS ";

export default function MyVehicleMaintenancePage() {
  const [user, setUser] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [uploadingReportId, setUploadingReportId] = useState(null);

  // Wizard state
  const [step, setStep] = useState(1); // 1 = Fotos, 2 = Bestätigung
  const [photos, setPhotos] = useState([]);

  const currentWeek = getWeekNumber(new Date());
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);
      const reports = await VehicleMaintenance.filter({ user_id: userData.id }, "-created_date");
      setMyReports(reports);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    }
    setIsLoading(false);
  };

  const hasSubmittedThisWeek = myReports.some(
    r => r.week === currentWeek && r.year === currentYear
  );





  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setIsUploading(true);
    try {
      const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f })));
      setPhotos(prev => [...prev, ...urls.map(r => r.file_url)]);
    } catch {
      alert("Fehler beim Hochladen der Fotos");
    }
    setIsUploading(false);
    e.target.value = null;
  };

  const removePhoto = (idx) => setPhotos(prev => prev.filter((_, i) => i !== idx));

  const handleAddPhotosToReport = async (e, report) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingReportId(report.id);
    try {
      const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f })));
      const newPhotos = [...(report.photos || []), ...urls.map(r => r.file_url)];
      await VehicleMaintenance.update(report.id, { photos: newPhotos, status: 'pending' });
      await loadData();
    } catch {
      alert("Fehler beim Hochladen der Fotos");
    }
    setUploadingReportId(null);
    e.target.value = null;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      await VehicleMaintenance.create({
        user_id: user.id,
        user_name: user.full_name,
        user_position: user.position,
        week: currentWeek,
        year: currentYear,
        submission_date: new Date().toISOString(),
        photos,
        status: "pending"
      });
      setStep(1);
      setPhotos([]);
      await loadData();
    } catch {
      alert("Fehler beim Speichern");
    }
    setIsSubmitting(false);
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: <Badge className="bg-orange-100 text-orange-800">Ausstehend</Badge>,
      approved: <Badge className="bg-green-100 text-green-800">Geprüft ✓</Badge>,
      rejected: <Badge className="bg-red-100 text-red-800">Beanstandet</Badge>,
    };
    return map[status] || map.pending;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
        <Card><CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="text-gray-600">Bitte melden Sie sich an.</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Fahrzeugpflege</h1>
          <p className="text-gray-500 text-sm">KW {currentWeek} / {currentYear}</p>
        </motion.div>

        {/* Already submitted */}
        {hasSubmittedThisWeek ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-none shadow-md mb-6">
              <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-green-700">Diese Woche bereits eingereicht!</p>
                <p className="text-sm text-gray-500">Du hast die Fahrzeugpflege für KW {currentWeek} bereits dokumentiert.</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* WIZARD */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Step indicators */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2].map(s => (
                <React.Fragment key={s}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step === s ? 'bg-blue-600 text-white shadow-md' :
                    step > s ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > s ? <Check className="w-4 h-4" /> : s}
                  </div>
                  {s < 2 && <div className={`h-1 w-10 rounded transition-all ${step > s ? 'bg-green-400' : 'bg-gray-200'}`} />}
                </React.Fragment>
              ))}
            </div>

            <Card className="border-none shadow-md">
              <CardContent className="p-6">
                <AnimatePresence mode="wait">

                  {/* STEP 1: Fotos */}
                  {step === 1 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Camera className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="font-bold text-lg text-gray-900">Fahrzeugzustand dokumentieren</h2>
                          <p className="text-sm text-gray-500">Fotos der Fahrzeugpflege hochladen</p>
                        </div>
                      </div>

                      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors">
                        {isUploading ? (
                          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                          ) : (
                          <div className="flex flex-col items-center">
                            <Upload className="w-8 h-8 text-blue-500 mb-2" />
                            <span className="text-sm font-medium text-blue-700">Fotos auswählen</span>
                            <span className="text-xs text-blue-500 mt-1">Mehrere Fotos möglich</span>
                          </div>
                          )}
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading} />
                      </label>

                      {photos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {photos.map((photo, idx) => (
                            <div key={idx} className="relative group">
                              <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                              <button
                                onClick={() => removePhoto(idx)}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}



                      <div className="flex gap-2">
                        <Button
                          className="w-full"
                          size="lg"
                          disabled={photos.length === 0}
                          onClick={() => setStep(2)}
                        >
                          Weiter <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: Bestätigung */}
                  {step === 2 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h2 className="font-bold text-lg text-gray-900">Zusammenfassung</h2>
                          <p className="text-sm text-gray-500">Bitte prüfen und abschicken</p>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 font-medium uppercase tracking-wide text-xs mb-2">Fotos ({photos.length})</p>
                        <div className="grid grid-cols-4 gap-1">
                          {photos.map((p, i) => (
                            <img key={i} src={p} alt={`Foto ${i + 1}`} className="w-full h-16 object-cover rounded-lg" />
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setStep(1)} disabled={isSubmitting}>
                          <ChevronLeft className="w-4 h-4 mr-1" /> Zurück
                        </Button>
                        <Button className="flex-1 bg-green-600 hover:bg-green-700" size="lg" onClick={handleSubmit} disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                          Einreichen
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Previous Reports */}
        {myReports.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Meine Dokumentationen
            </h2>
            <div className="space-y-3">
              {myReports.map(report => (
                <Card key={report.id} className="border-none shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">KW {report.week} / {report.year}</p>
                        <p className="text-xs text-gray-500">{new Date(report.submission_date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                      </div>
                      {getStatusBadge(report.status)}
                    </div>
                    {report.vehicle_info && <p className="text-sm text-gray-600 mb-2 font-mono">{report.vehicle_info}</p>}
                    {report.photos?.length > 0 && (
                      <div className="grid grid-cols-5 gap-1">
                        {report.photos.map((photo, idx) => (
                          <img key={idx} src={photo} alt={`Foto ${idx + 1}`} className="w-full h-14 object-cover rounded cursor-pointer hover:opacity-75" onClick={() => setLightboxUrl(photo)} />
                        ))}
                      </div>
                    )}
                    {report.admin_notes && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        <strong>Büro:</strong> {report.admin_notes}
                      </div>
                    )}
                    {report.status === 'rejected' && (
                      <div className="mt-3">
                        <label className="cursor-pointer">
                          <div className="flex items-center justify-center gap-2 w-full py-2 px-3 border-2 border-dashed border-red-300 rounded-lg bg-red-50 hover:bg-red-100 transition-colors text-sm text-red-700 font-medium">
                            {uploadingReportId === report.id ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Wird hochgeladen...</>
                            ) : (
                              <><Upload className="w-4 h-4" /> Neue Fotos nachreichen</>
                            )}
                          </div>
                          <input
                            type="file" multiple accept="image/*" className="hidden"
                            onChange={(e) => handleAddPhotosToReport(e, report)}
                            disabled={uploadingReportId === report.id}
                          />
                        </label>
                        <p className="text-xs text-gray-400 mt-1 text-center">Dokumentation wird nach dem Upload erneut zur Prüfung eingereicht</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[200] p-4"
          onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"
            onClick={() => setLightboxUrl(null)}>
            <X className="w-6 h-6" />
          </button>
          <img src={lightboxUrl} alt="Vorschau"
            className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
            onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}