import React, { useState, useEffect, useMemo } from "react";
import { User, VehicleMaintenance } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, X, AlertCircle, Loader2, Calendar, User as UserIcon, Car, Eye, Trash2, Upload, Camera } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export default function VehicleMaintenanceOverviewPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [allReports, setAllReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedWeek, setSelectedWeek] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [selectedReport, setSelectedReport] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingInspectionPhoto, setIsUploadingInspectionPhoto] = useState(false);
  const [openDialogId, setOpenDialogId] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [statsOpen, setStatsOpen] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setCurrentUser(userData);
      const [reportsData, usersData] = await Promise.all([
        VehicleMaintenance.list("-created_date"),
        User.list()
      ]);
      setAllReports(reportsData);
      setUsers(usersData.filter(u => u.position === 'Bauleiter' || u.position === 'Oberfläche' || u.position === 'Monteur'));
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    }
    setIsLoading(false);
  };

  const weekOptions = useMemo(() => {
    const weeks = new Set();
    allReports.forEach(r => weeks.add(`${r.year}-${String(r.week).padStart(2, '0')}`));
    return Array.from(weeks).sort().reverse();
  }, [allReports]);

  const filteredReports = useMemo(() => {
    return allReports.filter(report => {
      const weekMatch = selectedWeek === 'all' || `${report.year}-${String(report.week).padStart(2, '0')}` === selectedWeek;
      const userMatch = selectedUser === 'all' || report.user_id === selectedUser;
      const statusMatch = selectedStatus === 'all' || report.status === selectedStatus;
      return weekMatch && userMatch && statusMatch;
    });
  }, [allReports, selectedWeek, selectedUser, selectedStatus]);

  const stats = useMemo(() => {
    const currentWeek = getWeekNumber(new Date());
    const currentYear = new Date().getFullYear();
    const thisWeekReports = allReports.filter(r => r.week === currentWeek && r.year === currentYear);
    const expectedThisWeek = users.length;
    const submittedThisWeek = thisWeekReports.length;
    return {
      pending: allReports.filter(r => r.status === 'pending').length,
      approved: allReports.filter(r => r.status === 'approved').length,
      rejected: allReports.filter(r => r.status === 'rejected').length,
      submittedThisWeek,
      expectedThisWeek,
      completionRate: expectedThisWeek > 0 ? Math.round(submittedThisWeek / expectedThisWeek * 100) : 0
    };
  }, [allReports, users]);

  const handleDelete = async (reportId) => {
    if (!window.confirm("Dokumentation wirklich löschen?")) return;
    try {
      await VehicleMaintenance.delete(reportId);
      await loadData();
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
      alert("Fehler beim Löschen");
    }
  };

  const handleInspectionPhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !selectedReport) return;
    setIsUploadingInspectionPhoto(true);
    try {
      const uploadedUrls = await Promise.all(files.map(file => base44.integrations.Core.UploadFile({ file })));
      const newPhotos = uploadedUrls.map(res => ({
        url: res.file_url,
        uploaded_by: currentUser.full_name,
        uploaded_by_id: currentUser.id,
        uploaded_at: new Date().toISOString()
      }));
      const updated = [...(selectedReport.inspection_photos || []), ...newPhotos];
      await VehicleMaintenance.update(selectedReport.id, { inspection_photos: updated });
      const updatedReport = { ...selectedReport, inspection_photos: updated };
      setSelectedReport(updatedReport);
      setAllReports(prev => prev.map(r => r.id === selectedReport.id ? updatedReport : r));
    } catch (error) {
      console.error("Fehler beim Upload:", error);
      alert("Fehler beim Hochladen");
    }
    setIsUploadingInspectionPhoto(false);
    e.target.value = null;
  };

  const handleDeleteInspectionPhoto = async (photoIndex) => {
    if (!selectedReport) return;
    const updated = (selectedReport.inspection_photos || []).filter((_, i) => i !== photoIndex);
    await VehicleMaintenance.update(selectedReport.id, { inspection_photos: updated });
    const updatedReport = { ...selectedReport, inspection_photos: updated };
    setSelectedReport(updatedReport);
    setAllReports(prev => prev.map(r => r.id === selectedReport.id ? updatedReport : r));
  };

  const handleStatusUpdate = async (status) => {
    if (!selectedReport) return;
    setIsUpdating(true);
    try {
      await VehicleMaintenance.update(selectedReport.id, {
        status,
        checked_by: currentUser.full_name,
        checked_by_user_id: currentUser.id,
        checked_date: new Date().toISOString(),
        admin_notes: adminNotes
      });
      await loadData();
      setOpenDialogId(null);
      setSelectedReport(null);
      setAdminNotes('');
    } catch (error) {
      console.error("Fehler beim Update:", error);
      alert("Fehler beim Aktualisieren");
    }
    setIsUpdating(false);
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: <Badge className="bg-orange-100 text-orange-800 text-xs whitespace-nowrap">Ausstehend</Badge>,
      approved: <Badge className="bg-green-100 text-green-800 text-xs whitespace-nowrap">Geprüft ✓</Badge>,
      rejected: <Badge className="bg-red-100 text-red-800 text-xs whitespace-nowrap">Beanstandet</Badge>,
    };
    return map[status] || map.pending;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.position !== 'Büro')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 flex items-center justify-center">
        <Card><CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-lg font-semibold">Kein Zugriff</h2>
          <p className="text-gray-600">Diese Seite ist nur für Admins und Büro-Nutzer zugänglich.</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 md:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1">Fahrzeugpflege Übersicht</h1>
          <p className="text-xs md:text-sm text-gray-500">Kontrolle und Verwaltung der Fahrzeugpflege-Dokumentationen</p>
        </motion.div>

        {/* Stats Cards - collapsible */}
        <div className="mb-5">
        <button
          onClick={() => setStatsOpen(o => !o)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-3 transition-colors"
        >
          <span>{statsOpen ? '▲' : '▼'}</span>
          Statistiken {statsOpen ? 'ausblenden' : 'anzeigen'}
        </button>
        {statsOpen && <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Diese Woche", value: `${stats.submittedThisWeek}/${stats.expectedThisWeek}`, color: "text-blue-600", icon: <Calendar className="w-6 h-6 text-blue-400" /> },
            { label: "Quote", value: `${stats.completionRate}%`, color: "text-purple-600", icon: <Car className="w-6 h-6 text-purple-400" /> },
            { label: "Ausstehend", value: stats.pending, color: "text-orange-600", icon: <AlertCircle className="w-6 h-6 text-orange-400" /> },
            { label: "Geprüft", value: stats.approved, color: "text-green-600", icon: <Check className="w-6 h-6 text-green-400" /> },
            { label: "Beanstandet", value: stats.rejected, color: "text-red-600", icon: <X className="w-6 h-6 text-red-400" /> },
          ].map(s => (
            <Card key={s.label} className="border-none shadow-sm">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 truncate">{s.label}</p>
                    <p className={`text-xl md:text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                  <div className="shrink-0 hidden sm:block">{s.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>}
        </div>

        {/* Filters */}
        <Card className="border-none shadow-sm mb-5">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600">Kalenderwoche</Label>
                <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Wochen</SelectItem>
                    {weekOptions.map(week => {
                      const [year, weekNum] = week.split('-');
                      return <SelectItem key={week} value={week}>KW {parseInt(weekNum)} / {year}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600">Mitarbeiter</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.full_name} ({user.position})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600">Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="pending">Ausstehend</SelectItem>
                    <SelectItem value="approved">Geprüft</SelectItem>
                    <SelectItem value="rejected">Beanstandet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3 px-4 pt-4">
            <CardTitle className="text-base md:text-lg">Dokumentationen ({filteredReports.length})</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            <div className="space-y-3">
              {filteredReports.map(report => (
                <div key={report.id} className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                  {/* Report Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-gray-900 text-sm truncate">{report.user_name}</p>
                        <Badge variant="outline" className="text-xs shrink-0">{report.user_position}</Badge>
                        {getStatusBadge(report.status)}
                      </div>
                      <p className="text-xs text-gray-500">
                        KW {report.week} / {report.year} · {new Date(report.submission_date).toLocaleDateString('de-DE')}
                      </p>
                      {report.vehicle_info && (
                        <p className="text-xs text-gray-600 mt-1 font-mono">{report.vehicle_info}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Dialog open={openDialogId === report.id} onOpenChange={(open) => {
                        if (open) {
                          setOpenDialogId(report.id);
                          setSelectedReport(report);
                          setAdminNotes(report.admin_notes || '');
                        } else {
                          setOpenDialogId(null);
                          setSelectedReport(null);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4">
                          <DialogHeader>
                            <DialogTitle className="text-base">Fahrzeugpflege Dokumentation</DialogTitle>
                          </DialogHeader>
                          {selectedReport && selectedReport.id === report.id && (
                            <div className="space-y-4 mt-2">
                              {/* Info Grid */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-xs text-gray-500">Mitarbeiter</p>
                                  <p className="font-medium text-sm">{selectedReport.user_name}</p>
                                  <p className="text-xs text-gray-400">{selectedReport.user_position}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Woche</p>
                                  <p className="font-medium text-sm">KW {selectedReport.week} / {selectedReport.year}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Eingereicht am</p>
                                  <p className="font-medium text-sm">{new Date(selectedReport.submission_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Status</p>
                                  <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                                </div>
                              </div>

                              {selectedReport.vehicle_info && (
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-xs text-gray-500 mb-1">Kennzeichen</p>
                                  <p className="font-mono font-semibold text-sm">{selectedReport.vehicle_info}</p>
                                </div>
                              )}

                              {/* Mitarbeiter-Fotos */}
                              <div>
                                <p className="text-xs font-semibold text-gray-600 mb-2">Fotos vom Mitarbeiter ({selectedReport.photos?.length || 0})</p>
                                <div className="grid grid-cols-3 gap-2">
                                  {selectedReport.photos?.map((photo, idx) => (
                                    <img key={idx} src={photo} alt={`Foto ${idx + 1}`}
                                      className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-75"
                                      onClick={() => setLightboxUrl(photo)} />
                                  ))}
                                </div>
                              </div>

                              {/* Prüfungsfotos */}
                              <div className="border-t pt-3">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                                    <Camera className="w-3.5 h-3.5" />
                                    Prüfungsfotos ({selectedReport.inspection_photos?.length || 0})
                                  </p>
                                  <div>
                                    <input
                                      id={`inspection-upload-${selectedReport.id}`}
                                      type="file" multiple accept="image/*" className="hidden"
                                      onChange={handleInspectionPhotoUpload}
                                    />
                                    <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                                      onClick={() => document.getElementById(`inspection-upload-${selectedReport.id}`).click()}
                                      disabled={isUploadingInspectionPhoto}>
                                      {isUploadingInspectionPhoto ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                                      Fotos
                                    </Button>
                                  </div>
                                </div>
                                {selectedReport.inspection_photos?.length > 0 ? (
                                  <div className="grid grid-cols-3 gap-2">
                                    {selectedReport.inspection_photos.map((photo, idx) => (
                                      <div key={idx} className="relative group">
                                        <img src={photo.url} alt={`Prüfungsfoto ${idx + 1}`}
                                          className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-75"
                                          onClick={() => setLightboxUrl(photo.url)} />
                                        <div className="mt-0.5 px-0.5">
                                          <p className="text-xs text-gray-600 truncate">{photo.uploaded_by}</p>
                                        </div>
                                        <button onClick={() => handleDeleteInspectionPhoto(idx)}
                                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 italic">Noch keine Prüfungsfotos</p>
                                )}
                              </div>

                              {/* Admin Notes */}
                              <div>
                                <Label className="text-xs">Anmerkungen vom Büro</Label>
                                <Textarea
                                  value={adminNotes}
                                  onChange={e => setAdminNotes(e.target.value)}
                                  placeholder="Optional: Anmerkungen hinzufügen"
                                  rows={2}
                                  className="mt-1 text-sm"
                                />
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2">
                                <Button onClick={() => handleStatusUpdate('approved')} disabled={isUpdating}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-sm h-9">
                                  {isUpdating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                                  Geprüft
                                </Button>
                                <Button onClick={() => handleStatusUpdate('rejected')} disabled={isUpdating}
                                  variant="destructive" className="flex-1 text-sm h-9">
                                  {isUpdating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <X className="w-4 h-4 mr-1" />}
                                  Beanstanden
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(report.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Thumbnail Photos */}
                  {report.photos && report.photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-1 mt-2">
                      {report.photos.slice(0, 4).map((photo, idx) => (
                        <img key={idx} src={photo} alt={`Foto ${idx + 1}`}
                          className="w-full h-14 object-cover rounded cursor-pointer hover:opacity-75"
                          onClick={() => setLightboxUrl(photo)} />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {filteredReports.length === 0 && (
                <p className="text-center text-gray-500 py-10 text-sm">Keine Dokumentationen gefunden</p>
              )}
            </div>
          </CardContent>
        </Card>
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