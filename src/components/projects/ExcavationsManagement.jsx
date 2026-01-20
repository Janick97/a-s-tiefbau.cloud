import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Trash2, Shovel, MapPin, Euro, CheckSquare, Package } from "lucide-react";
import { Excavation, User } from "@/entities/all";
import ExcavationWizard from "../excavations/ExcavationWizard";
import ExcavationDetail from "../excavations/ExcavationDetail";

const statusColors = {
  planned: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  approved: "bg-purple-100 text-purple-800"
};

const statusLabels = {
  planned: "Geplant",
  in_progress: "In Arbeit",
  completed: "Abgeschlossen",
  approved: "Genehmigt"
};

export default function ExcavationsManagement({
  excavations,
  priceItems,
  projectId,
  onExcavationSubmit,
  onExcavationDelete,
  loadData,
  project,
  showAddButton = true,
  currentUser
}) {
  const [internalUser, setInternalUser] = useState(currentUser || null);
  const [bauleiterList, setBauleiterList] = useState([]);

  // Load user and bauleiter list if not provided
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = currentUser || await User.me();
        setInternalUser(userData);
        
        // Lade alle Bauleiter und Oberfläche-User für die Auswahl
        if (userData?.role === 'admin') {
          const allUsers = await User.list();
          const bauleiterUsers = allUsers.filter(u => 
            u.position === 'Bauleiter' || u.position === 'Oberfläche'
          );
          setBauleiterList(bauleiterUsers);
        }
      } catch (error) {
        console.log("Fehler beim Laden:", error);
        setInternalUser(null);
      }
    };
    loadUserData();
  }, [currentUser]);

  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editingExcavation, setEditingExcavation] = useState(null);
  const [selectedExcavation, setSelectedExcavation] = useState(null);
  const [showClosureDialog, setShowClosureDialog] = useState(false);
  const [closureDialogData, setClosureDialogData] = useState(null);
  const [showBackfillDialog, setShowBackfillDialog] = useState(false);
  const [backfillDialogData, setBackfillDialogData] = useState(null);

  const priceItemsMap = useMemo(() => {
    return new Map(priceItems.map(item => [item.id, item]));
  }, [priceItems]);

  const handleAdd = () => {
    setEditingExcavation(null);
    setShowForm(true);
  };

  const handleEdit = (excavation) => {
    setEditingExcavation(excavation);
    setShowForm(true);
  };

  const handleViewDetail = (excavation) => {
    setSelectedExcavation(excavation);
    setShowDetail(true);
  };

  const handleEditFromDetail = (excavation) => {
    setShowDetail(false);
    setEditingExcavation(excavation);
    setShowForm(true);
  };

  const handleSubmit = async (excavationData) => {
    await onExcavationSubmit(excavationData, editingExcavation?.id);
    setShowForm(false);
    setEditingExcavation(null);
    if (showDetail) {
      setShowDetail(false);
      setSelectedExcavation(null);
    }
  };

  const handleClosureToggle = async (excavation, isChecked) => {
    if (isChecked) {
      setClosureDialogData({
        excavation,
        closedDate: new Date().toISOString().split('T')[0],
        selectedUserId: null
      });
      setShowClosureDialog(true);
    } else {
      try {
        await Excavation.update(excavation.id, {
          is_closed: false,
          closed_date: null,
          closed_by: null,
          closed_by_user_id: null,
          surface_commission: null
        });
        loadData();
      } catch (error) {
        console.error("Fehler beim Aktualisieren:", error);
      }
    }
  };

  const handleClosureSubmit = async () => {
    const selectedUser = bauleiterList.find(u => u.id === closureDialogData.selectedUserId);
    if (!selectedUser) {
      alert("Bitte wählen Sie einen Bauleiter aus.");
      return;
    }

    const surfaceCommission = (closureDialogData.excavation.calculated_price || 0) * 0.3;

    try {
      await Excavation.update(closureDialogData.excavation.id, {
        is_closed: true,
        closed_date: closureDialogData.closedDate,
        closed_by: selectedUser.full_name,
        closed_by_user_id: selectedUser.id,
        surface_commission: surfaceCommission
      });
      setShowClosureDialog(false);
      setClosureDialogData(null);
      loadData();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    }
  };

  const handleBackfillToggle = async (excavation, isChecked) => {
    if (isChecked) {
      setBackfillDialogData({
        excavation,
        backfilledDate: new Date().toISOString().split('T')[0],
        selectedUserId: null
      });
      setShowBackfillDialog(true);
    } else {
      try {
        await Excavation.update(excavation.id, {
          is_backfilled: false,
          backfilled_date: null,
          backfilled_by: null,
          backfilled_by_user_id: null,
          backfill_commission: null
        });
        loadData();
      } catch (error) {
        console.error("Fehler beim Aktualisieren:", error);
      }
    }
  };

  const handleBackfillSubmit = async () => {
    const selectedUser = bauleiterList.find(u => u.id === backfillDialogData.selectedUserId);
    if (!selectedUser) {
      alert("Bitte wählen Sie einen Bauleiter aus.");
      return;
    }

    const backfillCommission = (backfillDialogData.excavation.calculated_price || 0) * 0.2;

    try {
      await Excavation.update(backfillDialogData.excavation.id, {
        is_backfilled: true,
        backfilled_date: backfillDialogData.backfilledDate,
        backfilled_by: selectedUser.full_name,
        backfilled_by_user_id: selectedUser.id,
        backfill_commission: backfillCommission
      });
      setShowBackfillDialog(false);
      setBackfillDialogData(null);
      loadData();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    }
  };

  const toggleClosed = (excavation) => {
    handleClosureToggle(excavation, !excavation.is_closed);
  };

  const toggleBackfilled = (excavation) => {
    handleBackfillToggle(excavation, !excavation.is_backfilled);
  };

  const getPriceItemDescription = (priceItemId) => {
    const item = priceItemsMap.get(priceItemId);
    return item ? `${item.item_number} - ${item.description}` : 'Unbekannte Position';
  };

  const getSelectedPriceItem = (priceItemId) => {
    return priceItemsMap.get(priceItemId);
  };

  const renderContent = () => {
    if (excavations.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Shovel className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Noch keine Ausgrabungen angelegt</p>
          {showAddButton && (
            <Button onClick={() => setShowForm(true)} className="mt-3">
              Erste Ausgrabung hinzufügen
            </Button>
          )}
        </div>
      );
    }

    return (
      <div>
        {/* Desktop View: Table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="w-20">Geschlossen</TableHead>
                <TableHead className="w-20">Verfüllt</TableHead>
                <TableHead>Standort</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bauleiter</TableHead>
                <TableHead className="text-right">Preis</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {excavations.map((excavation, index) => (
                  <motion.tr
                    key={excavation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                      excavation.is_closed && excavation.is_backfilled ? 'bg-green-50 hover:bg-green-100' : ''
                    }`}
                    onClick={() => handleViewDetail(excavation)}
                  >
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        #{index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col items-center gap-1">
                        <Checkbox
                          checked={excavation.is_closed || false}
                          onCheckedChange={(checked) => handleClosureToggle(excavation, checked)}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                        {excavation.is_closed && excavation.closed_date && (
                          <div className="text-xs text-green-600 text-center">
                            <div>{new Date(excavation.closed_date).toLocaleDateString('de-DE')}</div>
                            {excavation.closed_by && (
                              <div className="text-green-700 font-medium">{excavation.closed_by}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col items-center gap-1">
                        <Checkbox
                          checked={excavation.is_backfilled || false}
                          onCheckedChange={(checked) => handleBackfillToggle(excavation, checked)}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                        {excavation.is_backfilled && excavation.backfilled_date && (
                          <div className="text-xs text-green-600 text-center">
                            <div>{new Date(excavation.backfilled_date).toLocaleDateString('de-DE')}</div>
                            {excavation.backfilled_by && (
                              <div className="text-green-700 font-medium">{excavation.backfilled_by}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {excavation.location_name}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {getPriceItemDescription(excavation.price_item_id)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          {excavation.street} {excavation.house_number}, {excavation.city}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[excavation.status]}>
                        {statusLabels[excavation.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {excavation.foreman}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Euro className="w-4 h-4 text-green-500" />
                        <span className="font-semibold text-green-600">
                          €{(excavation.calculated_price || 0).toLocaleString('de-DE')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(excavation);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onExcavationDelete(excavation.id);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden space-y-4">
          {excavations.map((excavation, index) => {
            const priceItem = priceItemsMap.get(excavation.price_item_id);
            return (
              <motion.div
                key={excavation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`card-elevation border-l-4 ${
                    excavation.is_closed && excavation.is_backfilled ? 'border-green-500' : 'border-orange-400'
                  }`}
                  onClick={() => handleViewDetail(excavation)}
                >
                  <CardContent className="p-3">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono text-xs">
                              #{index + 1}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-gray-900 truncate text-sm">
                            {excavation.location_name}
                          </h3>
                          <p className="text-xs text-gray-600 truncate">
                            {excavation.street} {excavation.house_number}, {excavation.city}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleEdit(excavation); }}
                            className="p-1"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); onExcavationDelete(excavation.id); }}
                            className="p-1"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      </div>

                      {/* Status badges */}
                      <div className="flex flex-wrap gap-1">
                        <Badge className={`${statusColors[excavation.status]} text-xs px-2 py-0.5`}>
                          {statusLabels[excavation.status]}
                        </Badge>
                        {excavation.foreman && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            {excavation.foreman}
                          </Badge>
                        )}
                        {excavation.is_closed && (
                          <Badge className="bg-green-100 text-green-800 text-xs px-2 py-0.5">
                            Geschlossen
                          </Badge>
                        )}
                        {excavation.is_backfilled && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5">
                            Verfüllt
                          </Badge>
                        )}
                      </div>

                      {/* Details */}
                      <div className="border-t pt-2 space-y-1 text-xs">
                        <div className="flex justify-between items-start">
                          <span className="text-gray-500 flex-shrink-0">Position</span>
                          <span className="font-medium text-right min-w-0 truncate ml-2">
                            {priceItem ? `${priceItem.item_number} - ${priceItem.description}` : 'Unbekannte Position'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 flex-shrink-0">Menge</span>
                          <span className="font-medium">
                            {excavation.quantity} {priceItem?.unit || ''}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 flex-shrink-0">Preis</span>
                          <span className="font-semibold text-green-600">
                            €{(excavation.calculated_price || 0).toLocaleString('de-DE')}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons for mobile */}
                      <div className="border-t pt-2 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs py-1"
                          onClick={(e) => { e.stopPropagation(); toggleClosed(excavation); }}
                        >
                          {excavation.is_closed ? 'Öffnen' : 'Schließen'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs py-1"
                          onClick={(e) => { e.stopPropagation(); toggleBackfilled(excavation); }}
                        >
                          {excavation.is_backfilled ? 'Nicht verfüllt' : 'Verfüllen'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h3 className="text-xl font-bold">Ausgrabungen ({excavations.length})</h3>
        {showAddButton && (
          <Button onClick={() => setShowForm(true)} className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Neue Ausgrabung
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <ExcavationWizard
            excavation={editingExcavation}
            projects={[project]}
            defaultProjectId={projectId}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingExcavation(null);
            }}
          />
        )}
      </AnimatePresence>

      {renderContent()}

      {/* Closure Dialog */}
      {showClosureDialog && closureDialogData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowClosureDialog(false); }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md"
          >
            <Card className="card-elevation border-none">
              <CardHeader className="bg-green-500 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5" />
                  Grube/Graben als geschlossen markieren
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    <strong>{closureDialogData.excavation.location_name}</strong>
                  </p>
                  <p className="text-xs text-gray-500">
                    {getPriceItemDescription(closureDialogData.excavation.price_item_id)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="closed_date">Datum der Schließung</Label>
                  <Input
                    id="closed_date"
                    type="date"
                    value={closureDialogData.closedDate}
                    onChange={(e) => setClosureDialogData(prev => ({
                      ...prev,
                      closedDate: e.target.value
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="closed_by">Geschlossen durch</Label>
                  <Select
                    value={closureDialogData.selectedUserId || ''}
                    onValueChange={(value) => setClosureDialogData(prev => ({
                      ...prev,
                      selectedUserId: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Bauleiter/Oberfläche auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bauleiterList.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {closureDialogData.selectedUserId && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      <strong>Provision:</strong> 30% = €{((closureDialogData.excavation.calculated_price || 0) * 0.3).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Die Provision wird auf das Konto von {bauleiterList.find(u => u.id === closureDialogData.selectedUserId)?.full_name} gebucht.
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end gap-3 bg-gray-50 rounded-b-lg">
                <Button variant="outline" onClick={() => setShowClosureDialog(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleClosureSubmit} className="bg-green-600 hover:bg-green-700">
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Als geschlossen markieren
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Backfill Dialog */}
      {showBackfillDialog && backfillDialogData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowBackfillDialog(false); }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md"
          >
            <Card className="card-elevation border-none">
              <CardHeader className="bg-orange-500 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Grube/Graben als verfüllt markieren
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    <strong>{backfillDialogData.excavation.location_name}</strong>
                  </p>
                  <p className="text-xs text-gray-500">
                    {getPriceItemDescription(backfillDialogData.excavation.price_item_id)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backfilled_date">Datum der Verfüllung</Label>
                  <Input
                    id="backfilled_date"
                    type="date"
                    value={backfillDialogData.backfilledDate}
                    onChange={(e) => setBackfillDialogData(prev => ({
                      ...prev,
                      backfilledDate: e.target.value
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backfilled_by">Verfüllt durch</Label>
                  <Select
                    value={backfillDialogData.selectedUserId || ''}
                    onValueChange={(value) => setBackfillDialogData(prev => ({
                      ...prev,
                      selectedUserId: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Bauleiter/Oberfläche auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bauleiterList.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {backfillDialogData.selectedUserId && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-sm text-orange-800">
                      <strong>Provision:</strong> 20% = €{((backfillDialogData.excavation.calculated_price || 0) * 0.2).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      Die Provision wird auf das Konto von {bauleiterList.find(u => u.id === backfillDialogData.selectedUserId)?.full_name} gebucht.
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end gap-3 bg-gray-50 rounded-b-lg">
                <Button variant="outline" onClick={() => setShowBackfillDialog(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleBackfillSubmit} className="bg-orange-600 hover:bg-orange-700">
                  <Package className="w-4 h-4 mr-2" />
                  Als verfüllt markieren
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </motion.div>
      )}

      <ExcavationDetail
        excavation={selectedExcavation}
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedExcavation(null);
        }}
        onEdit={handleEditFromDetail}
        projectTitle={project?.title}
        priceItem={getSelectedPriceItem(selectedExcavation?.price_item_id)}
        currentUser={internalUser}
      />
    </div>
  );
}