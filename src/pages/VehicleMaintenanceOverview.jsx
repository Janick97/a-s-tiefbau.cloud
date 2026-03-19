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

  useEffect(() => {
    loadData();
  }, []);

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
      const teamUsers = usersData.filter(u => u.position === 'Bauleiter' || u.position === 'Oberfläche' || u.position === 'Monteur');
      setUsers(teamUsers);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    }
    setIsLoading(false);
  };

  const weekOptions = useMemo(() => {
    const weeks = new Set();
    allReports.forEach(report => {
      weeks.add(`${report.year}-${String(report.week).padStart(2, '0')}`);
    });
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
    const pending = allReports.filter(r => r.status === 'pending').length;
    const approved = allReports.filter(r => r.status === 'approved').length;
    const rejected = allReports.filter(r => r.status === 'rejected').length;

    const expectedThisWeek = users.length;
    const submittedThisWeek = thisWeekReports.length;

    return {
      pending,
      approved,
      rejected,
      submittedThisWeek,
      expectedThisWeek,
      completionRate: expectedThisWeek > 0 ? Math.round((submittedThisWeek / expectedThisWeek) * 100) : 0
    };
  }, [allReports, users]);

  function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

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
      const uploadedUrls = await Promise.all(
        files.map(file => base44.integrations.Core.UploadFile({ file }))
      );
      const newPhotos = uploadedUrls.map(res => ({
        url: res.file_url,
        uploaded_by: currentUser.full_name,
        uploaded_by_id: currentUser.id,
        uploaded_at: new Date().toISOString()
      }));
      const existing = selectedReport.inspection_photos || [];
      const updated = [...existing, ...newPhotos];
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
        status: status,
        checked_by: currentUser.full_name,
        checked_by_user_id: currentUser.id,
        checked_date: new Date().toISOString(),
        admin_notes: adminNotes
      });

      await loadData();
      setSelectedReport(null);
      setAdminNotes('');
    } catch (error) {
      console.error("Fehler beim Update:", error);
      alert("Fehler beim Aktualisieren");
    }
    setIsUpdating(false);
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { variant: "outline", text: "Ausstehend", color: "bg-orange-100 text-orange-800" },
      approved: { variant: "default", text: "Geprüft ✓", color: "bg-green-100 text-green-800" },
      rejected: { variant: "destructive", text: "Beanstandet", color: "bg-red-100 text-red-800" }
    };
    const config = variants[status] || variants.pending;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.position !== 'Büro')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 flex items-center justify-center">
        <Card className="card-elevation border-none">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-lg font-semibold">Kein Zugriff</h2>
            <p className="text-gray-600">Diese Seite ist nur für Admins und Büro-Nutzer zugänglich.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Fahrzeugpflege Übersicht
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Kontrolle und Verwaltung der Fahrzeugpflege-Dokumentationen
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="card-elevation border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Diese Woche</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {stats.submittedThisWeek}/{stats.expectedThisWeek}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevation border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Quote</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.completionRate}%</p>
                </div>
                <Car className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevation border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ausstehend</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevation border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Geprüft</p>
                  <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <Check className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevation border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Beanstandet</p>
                  <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <X className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-elevation border-none mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Kalenderwoche</Label>
                <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Wochen</SelectItem>
                    {weekOptions.map(week => {
                      const [year, weekNum] = week.split('-');
                      return (
                        <SelectItem key={week} value={week}>
                          KW {parseInt(weekNum)} / {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mitarbeiter</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.position})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
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
        <Card className="card-elevation border-none">
          <CardHeader>
            <CardTitle>Dokumentationen ({filteredReports.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <div key={report.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <UserIcon className="w-5 h-5 text-gray-500" />
                        <p className="font-medium text-gray-900">{report.user_name}</p>
                        <Badge variant="outline" className="text-xs">{report.user_position}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        KW {report.week} / {report.year} • {new Date(report.submission_date).toLocaleDateString('de-DE')}
                      </p>
                      {report.vehicle_info && (
                        <p className="text-sm text-gray-600">
                          <Car className="w-4 h-4 inline mr-1" />
                          {report.vehicle_info}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {getStatusBadge(report.status)}
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
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Fahrzeugpflege Dokumentation</DialogTitle>
                          </DialogHeader>
                          {selectedReport && selectedReport.id === report.id && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-gray-600">Mitarbeiter</Label>
                                  <p className="font-medium">{selectedReport.user_name} ({selectedReport.user_position})</p>
                                </div>
                                <div>
                                  <Label className="text-gray-600">Woche</Label>
                                  <p className="font-medium">KW {selectedReport.week} / {selectedReport.year}</p>
                                </div>
                                <div>
                                  <Label className="text-gray-600">Eingereicht am</Label>
                                  <p className="font-medium">{new Date(selectedReport.submission_date).toLocaleString('de-DE')}</p>
                                </div>
                                <div>
                                  <Label className="text-gray-600">Status</Label>
                                  <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                                </div>
                              </div>

                              {selectedReport.vehicle_info && (
                                <div>
                                  <Label className="text-gray-600">Fahrzeuginfo</Label>
                                  <p className="font-medium">{selectedReport.vehicle_info}</p>
                                </div>
                              )}

                              {selectedReport.notes && (
                                <div>
                                  <Label className="text-gray-600">Notizen</Label>
                                  <p className="text-sm">{selectedReport.notes}</p>
                                </div>
                              )}

                              {/* Einreichungs-Fotos */}
                              <div>
                                <Label className="text-gray-600 mb-2 block">Fotos vom Mitarbeiter ({selectedReport.photos?.length || 0})</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {selectedReport.photos?.map((photo, idx) => (
                                   <img
                                     key={idx}
                                     src={photo}
                                     alt={`Foto ${idx + 1}`}
                                     className="w-full h-40 object-cover rounded cursor-pointer hover:opacity-75"
                                     onClick={() => setLightboxUrl(photo)}
                                   />
                                  ))}
                                </div>
                              </div>

                              {/* Prüfungsfotos */}
                              <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <Label className="text-gray-700 font-semibold flex items-center gap-2">
                                    <Camera className="w-4 h-4" />
                                    Fotos aus der Prüfung ({selectedReport.inspection_photos?.length || 0})
                                  </Label>
                                  <div>
                                    <input
                                      id={`inspection-upload-${selectedReport.id}`}
                                      type="file"
                                      multiple
                                      accept="image/*"
                                      className="hidden"
                                      onChange={handleInspectionPhotoUpload}
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => document.getElementById(`inspection-upload-${selectedReport.id}`).click()}
                                      disabled={isUploadingInspectionPhoto}
                                    >
                                      {isUploadingInspectionPhoto
                                        ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        : <Upload className="w-4 h-4 mr-2" />}
                                      Fotos hinzufügen
                                    </Button>
                                  </div>
                                </div>
                                {selectedReport.inspection_photos?.length > 0 ? (
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {selectedReport.inspection_photos.map((photo, idx) => (
                                      <div key={idx} className="relative group">
                                        <img
                                         src={photo.url}
                                         alt={`Prüfungsfoto ${idx + 1}`}
                                         className="w-full h-40 object-cover rounded cursor-pointer hover:opacity-75"
                                         onClick={() => setLightboxUrl(photo.url)}
                                        />
                                        <div className="mt-1 px-1">
                                          <p className="text-xs text-gray-600 font-medium">{photo.uploaded_by}</p>
                                          <p className="text-xs text-gray-400">{new Date(photo.uploaded_at).toLocaleString('de-DE')}</p>
                                        </div>
                                        <button
                                          onClick={() => handleDeleteInspectionPhoto(idx)}
                                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-400 italic">Noch keine Prüfungsfotos hochgeladen</p>
                                )}
                              </div>

                              <div>
                                <Label>Anmerkungen vom Büro</Label>
                                <Textarea
                                  value={adminNotes}
                                  onChange={(e) => setAdminNotes(e.target.value)}
                                  placeholder="Optional: Anmerkungen hinzufügen"
                                  rows={3}
                                  className="mt-2"
                                />
                              </div>

                              <div className="flex gap-3">
                                <Button
                                  onClick={() => handleStatusUpdate('approved')}
                                  disabled={isUpdating}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                  {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                  Als geprüft markieren
                                </Button>
                                <Button
                                  onClick={() => handleStatusUpdate('rejected')}
                                  disabled={isUpdating}
                                  variant="destructive"
                                  className="flex-1"
                                >
                                  {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                                  Beanstanden
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(report.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {report.photos && report.photos.length > 0 && (
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                      {report.photos.slice(0, 6).map((photo, idx) => (
                        <img
                          key={idx}
                          src={photo}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-75"
                          onClick={() => setLightboxUrl(photo)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {filteredReports.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  Keine Dokumentationen gefunden
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}