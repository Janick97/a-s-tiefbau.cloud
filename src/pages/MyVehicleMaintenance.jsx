import React, { useState, useEffect } from "react";
import { User, VehicleMaintenance } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, Check, AlertCircle, Camera, Loader2, Calendar } from "lucide-react";
import { motion } from "framer-motion";

export default function MyVehicleMaintenancePage() {
  const [user, setUser] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [photos, setPhotos] = useState([]);
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [notes, setNotes] = useState('');

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

  function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  const hasSubmittedThisWeek = myReports.some(
    report => report.week === currentWeek && report.year === currentYear
  );

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      setPhotos([...photos, ...uploadedUrls]);
    } catch (error) {
      console.error("Fehler beim Upload:", error);
      alert("Fehler beim Hochladen der Fotos");
    }
    setIsUploading(false);
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      alert("Bitte laden Sie mindestens ein Foto hoch");
      return;
    }

    setIsSubmitting(true);
    try {
      await VehicleMaintenance.create({
        user_id: user.id,
        user_name: user.full_name,
        user_position: user.position,
        week: currentWeek,
        year: currentYear,
        submission_date: new Date().toISOString(),
        photos: photos,
        vehicle_info: vehicleInfo,
        notes: notes,
        status: "pending"
      });

      alert("Fahrzeugpflege erfolgreich dokumentiert!");
      setPhotos([]);
      setVehicleInfo('');
      setNotes('');
      await loadData();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern");
    }
    setIsSubmitting(false);
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { variant: "outline", text: "Ausstehend", color: "text-orange-600" },
      approved: { variant: "default", text: "Geprüft ✓", color: "text-green-600" },
      rejected: { variant: "destructive", text: "Beanstandet", color: "text-red-600" }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} className={config.color}>{config.text}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user || !['Bauleiter', 'Oberfläche', 'Monteur'].includes(user.position)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 flex items-center justify-center">
        <Card className="card-elevation border-none">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-lg font-semibold">Kein Zugriff</h2>
            <p className="text-gray-600">Diese Seite ist nur für Mitarbeiter zugänglich.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Fahrzeugpflege Dokumentation
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Jeden Freitag/Samstag Fahrzeugpflege dokumentieren
          </p>
        </motion.div>

        {/* Current Week Status */}
        <Card className="card-elevation border-none mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aktuelle Woche</p>
                <p className="text-2xl font-bold text-gray-900">KW {currentWeek} / {currentYear}</p>
              </div>
              <div>
                {hasSubmittedThisWeek ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="w-6 h-6" />
                    <span className="font-medium">Bereits eingereicht</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="w-6 h-6" />
                    <span className="font-medium">Noch nicht eingereicht</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submission Form */}
        {!hasSubmittedThisWeek && (
          <Card className="card-elevation border-none mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Neue Dokumentation einreichen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Fahrzeuginfo (optional)</Label>
                <Input
                  value={vehicleInfo}
                  onChange={(e) => setVehicleInfo(e.target.value)}
                  placeholder="z.B. Kennzeichen, Fahrzeugtyp"
                />
              </div>

              <div>
                <Label>Fotos hochladen *</Label>
                <div className="mt-2">
                  <label className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="w-8 h-8 text-gray-600" />
                      <span className="text-sm text-gray-600">
                        {isUploading ? "Hochladen..." : "Fotos auswählen"}
                      </span>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
                
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {photos.map((photo, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={photo}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8"
                          onClick={() => removePhoto(idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label>Notizen (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Besondere Vorkommnisse, durchgeführte Arbeiten, etc."
                  rows={4}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || photos.length === 0}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird eingereicht...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Dokumentation einreichen
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Previous Reports */}
        <Card className="card-elevation border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Meine bisherigen Dokumentationen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myReports.map((report) => (
                <div key={report.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        KW {report.week} / {report.year}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(report.submission_date).toLocaleDateString('de-DE', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    {getStatusBadge(report.status)}
                  </div>

                  {report.vehicle_info && (
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Fahrzeug:</strong> {report.vehicle_info}
                    </p>
                  )}

                  {report.photos && report.photos.length > 0 && (
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-3">
                      {report.photos.map((photo, idx) => (
                        <img
                          key={idx}
                          src={photo}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-75"
                          onClick={() => window.open(photo, '_blank')}
                        />
                      ))}
                    </div>
                  )}

                  {report.notes && (
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Notizen:</strong> {report.notes}
                    </p>
                  )}

                  {report.admin_notes && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm font-medium text-yellow-900 mb-1">
                        Anmerkungen vom Büro:
                      </p>
                      <p className="text-sm text-yellow-800">{report.admin_notes}</p>
                    </div>
                  )}
                </div>
              ))}

              {myReports.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  Noch keine Dokumentationen vorhanden
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}