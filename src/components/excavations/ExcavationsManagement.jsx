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
import { Plus, Edit, Trash2, Shovel, MapPin, Euro, CheckSquare, Package, GitFork, CornerDownRight } from "lucide-react";
import { Excavation } from "@/entities/all";
import ExcavationForm from "../excavations/ExcavationForm";
import ExcavationDetail from "../excavations/ExcavationDetail";

const statusColors = {
  planned: "bg-blue-100 text-blue-800",
  in_progress: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  approved: "bg-purple-100 text-purple-800",
};

const statusLabels = {
  planned: "Geplant",
  in_progress: "In Arbeit",
  completed: "Abgeschlossen",
  approved: "Genehmigt",
};

export default function ExcavationsManagement({
  excavations,
  priceItems,
  projectId,
  onExcavationSubmit,
  onExcavationDelete,
  loadData,
  project,
  showAddButton = true
}) {
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editingExcavation, setEditingExcavation] = useState(null);
  const [selectedExcavation, setSelectedExcavation] = useState(null);
  const [parentExcavationId, setParentExcavationId] = useState(null);
  const [showClosureDialog, setShowClosureDialog] = useState(false);
  const [closureDialogData, setClosureDialogData] = useState(null);
  const [showBackfillDialog, setShowBackfillDialog] = useState(false);
  const [backfillDialogData, setBackfillDialogData] = useState(null);

  const priceItemsMap = useMemo(() => {
    return new Map(priceItems.map(item => [item.id, item]));
  }, [priceItems]);

  const nestedExcavations = useMemo(() => {
    const items = JSON.parse(JSON.stringify(excavations || []));
    const itemMap = new Map(items.map(item => [item.id, {...item, children: []}]));
    const roots = [];
    
    for (const item of itemMap.values()) {
      if (item.parent_excavation_id && itemMap.has(item.parent_excavation_id)) {
        const parent = itemMap.get(item.parent_excavation_id);
        if (parent) {
          parent.children.push(item);
        }
      } else {
        roots.push(item);
      }
    }
    return roots.sort((a,b) => new Date(b.created_date) - new Date(a.created_date));
  }, [excavations]);

  const handleAdd = () => {
    setEditingExcavation(null);
    setParentExcavationId(null);
    setShowForm(true);
  };
  
  const handleAddSubItem = (parentId) => {
    setEditingExcavation(null);
    setParentExcavationId(parentId);
    setShowForm(true);
  };

  const handleEdit = (excavation) => {
    setEditingExcavation(excavation);
    setParentExcavationId(excavation.parent_excavation_id || null);
    setShowForm(true);
  };

  const handleViewDetail = (excavation) => {
    setSelectedExcavation(excavation);
    setShowDetail(true);
  };

  const handleEditFromDetail = (excavation) => {
    setShowDetail(false);
    setEditingExcavation(excavation);
    setParentExcavationId(excavation.parent_excavation_id || null);
    setShowForm(true);
  };

  const handleSubmit = async (excavationData) => {
    await onExcavationSubmit(excavationData, editingExcavation?.id);
    setShowForm(false);
    setEditingExcavation(null);
    setParentExcavationId(null);
    if (showDetail) {
      setShowDetail(false);
      setSelectedExcavation(null);
    }
  };

  const toggleClosed = async (excavationId, is_closed, closed_date, closed_by) => {
    await Excavation.update(excavationId, { is_closed, closed_date, closed_by });
    loadData();
  };

  const toggleBackfilled = async (excavationId, is_backfilled, backfilled_date, backfilled_by) => {
    await Excavation.update(excavationId, { is_backfilled, backfilled_date, backfilled_by });
    loadData();
  };
  
  const handleClosureToggle = (excavation, checked) => {
    if (checked) {
      setClosureDialogData({
        excavationId: excavation.id,
        is_closed: true,
        closed_date: new Date().toISOString().split('T')[0],
        closed_by: 'Nicht angegeben',
      });
      setShowClosureDialog(true);
    } else {
      toggleClosed(excavation.id, false, null, null);
    }
  };

  const handleClosureSubmit = async () => {
    if (closureDialogData) {
      await toggleClosed(
        closureDialogData.excavationId,
        true,
        closureDialogData.closed_date,
        closureDialogData.closed_by
      );
      setShowClosureDialog(false);
      setClosureDialogData(null);
    }
  };

  const handleBackfillToggle = (excavation, checked) => {
    if (checked) {
      setBackfillDialogData({
        excavationId: excavation.id,
        is_backfilled: true,
        backfilled_date: new Date().toISOString().split('T')[0],
        backfilled_by: 'Nicht angegeben',
      });
      setShowBackfillDialog(true);
    } else {
      toggleBackfilled(excavation.id, false, null, null);
    }
  };
  
  const handleBackfillSubmit = async () => {
    if (backfillDialogData) {
      await toggleBackfilled(
        backfillDialogData.excavationId,
        true,
        backfillDialogData.backfilled_date,
        backfillDialogData.backfilled_by
      );
      setShowBackfillDialog(false);
      setBackfillDialogData(null);
    }
  };

  const getPriceItemDescription = (priceItemId) => {
    const item = priceItemsMap.get(priceItemId);
    return item ? `${item.item_number} - ${item.description}` : 'Unbekannte Position';
  };

  const getSelectedPriceItem = (priceItemId) => {
    return priceItemsMap.get(priceItemId);
  };

  const renderExcavationRow = (excavation, isSubItem = false) => (
    <motion.tr
      key={excavation.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      layout
      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
        excavation.is_closed && excavation.is_backfilled ? 'bg-green-50/70 hover:bg-green-100' : ''
      } ${isSubItem ? 'bg-gray-50/50' : ''}`}
      onClick={() => handleViewDetail(excavation)}
    >
      <TableCell onClick={(e) => e.stopPropagation()} className={`relative ${isSubItem ? "pl-12" : ""}`}>
        {isSubItem && <CornerDownRight className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />}
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
        {isSubItem && <Badge variant="outline" className="ml-2 font-normal">Unterposition</Badge>}
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
        <div className="flex justify-end gap-1">
          {!isSubItem && (
             <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddSubItem(excavation.id);
                }}
                title="Unterposition hinzufügen"
              >
                <GitFork className="w-4 h-4 text-blue-600" />
              </Button>
          )}
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
  );

  const renderExcavationCard = (excavation, isSubItem = false) => {
    const priceItem = priceItemsMap.get(excavation.price_item_id);
    return (
      <motion.div
        key={excavation.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        layout
      >
        <Card
          className={`card-elevation border-l-4 ${
            excavation.is_closed && excavation.is_backfilled ? 'border-green-500' : 'border-orange-400'
          } ${isSubItem ? 'ml-4' : ''}`}
          onClick={() => handleViewDetail(excavation)}
        >
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate flex items-center gap-2">
                     {isSubItem && <CornerDownRight className="w-4 h-4 text-gray-400" />}
                    {excavation.location_name}
                  </h3>
                  <p className={`text-sm text-gray-600 truncate ${isSubItem ? 'pl-6' : ''}`}>
                    {excavation.street} {excavation.house_number}, {excavation.city}
                  </p>
                </div>
                <div className="flex gap-1 ml-2">
                  {!isSubItem && (
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleAddSubItem(excavation.id); }}>
                      <GitFork className="w-4 h-4 text-blue-600" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(excavation); }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onExcavationDelete(excavation.id); }}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {/* Status badges */}
              <div className={`flex flex-wrap gap-2 ${isSubItem ? 'pl-6' : ''}`}>
                {isSubItem && <Badge variant="outline">Unterposition</Badge>}
                <Badge className={statusColors[excavation.status]}>
                  {statusLabels[excavation.status]}
                </Badge>
              </div>

              {/* Details */}
              <div className={`border-t pt-3 space-y-2 text-sm ${isSubItem ? 'pl-6' : ''}`}>
                <div className="flex justify-between">
                  <span className="text-gray-500">Position</span>
                  <span className="font-medium text-right">
                    {priceItem ? `${priceItem.item_number} - ${priceItem.description}` : 'Unbekannte Position'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Preis</span>
                  <span className="font-semibold text-green-600">
                    €{(excavation.calculated_price || 0).toLocaleString('de-DE')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };


  const renderContent = () => {
    if (nestedExcavations.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Shovel className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Noch keine Leistungen angelegt</p>
          {showAddButton && (
            <Button onClick={handleAdd} className="mt-3">
              Erste Leistung hinzufügen
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
                <TableHead className="w-32">Geschlossen</TableHead>
                <TableHead className="w-32">Verfüllt</TableHead>
                <TableHead>Standort</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bauleiter</TableHead>
                <TableHead className="text-right">Preis</TableHead>
                <TableHead className="text-right w-[150px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {nestedExcavations.map(excavation => (
                  <React.Fragment key={excavation.id}>
                    {renderExcavationRow(excavation, false)}
                    {excavation.children.map(child => renderExcavationRow(child, true))}
                  </React.Fragment>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden space-y-4">
          {nestedExcavations.map(excavation => (
            <React.Fragment key={excavation.id}>
              {renderExcavationCard(excavation, false)}
              {excavation.children.map(child => renderExcavationCard(child, true))}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h3 className="text-xl font-bold">Leistungen ({excavations.length})</h3>
        {showAddButton && (
          <Button onClick={handleAdd} className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Neue Leistung
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="mb-6">
            <ExcavationForm
              excavation={editingExcavation}
              parentExcavationId={parentExcavationId}
              projects={[project]}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingExcavation(null);
                setParentExcavationId(null);
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {renderContent()}

      <AnimatePresence>
        {showClosureDialog && closureDialogData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-semibold mb-4">Abschlussdetails</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="closed_date">Abschlussdatum</Label>
                  <Input
                    id="closed_date"
                    type="date"
                    value={closureDialogData.closed_date}
                    onChange={(e) => setClosureDialogData({ ...closureDialogData, closed_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="closed_by">Abgeschlossen von</Label>
                  <Select
                    value={closureDialogData.closed_by}
                    onValueChange={(value) => setClosureDialogData({ ...closureDialogData, closed_by: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nicht angegeben">Nicht angegeben</SelectItem>
                      <SelectItem value="Sabri">Sabri</SelectItem>
                      <SelectItem value="Dogan">Dogan</SelectItem>
                      <SelectItem value="Ahmet">Ahmet</SelectItem>
                      <SelectItem value="Externe Firma">Externe Firma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowClosureDialog(false)}>Abbrechen</Button>
                <Button onClick={handleClosureSubmit}>Speichern</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBackfillDialog && backfillDialogData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-semibold mb-4">Verfülldetails</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="backfilled_date">Verfülldatum</Label>
                  <Input
                    id="backfilled_date"
                    type="date"
                    value={backfillDialogData.backfilled_date}
                    onChange={(e) => setBackfillDialogData({ ...backfillDialogData, backfilled_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="backfilled_by">Verfüllt von</Label>
                  <Select
                    value={backfillDialogData.backfilled_by}
                    onValueChange={(value) => setBackfillDialogData({ ...backfillDialogData, backfilled_by: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nicht angegeben">Nicht angegeben</SelectItem>
                      <SelectItem value="Sabri">Sabri</SelectItem>
                      <SelectItem value="Dogan">Dogan</SelectItem>
                      <SelectItem value="Ahmet">Ahmet</SelectItem>
                      <SelectItem value="Externe Firma">Externe Firma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBackfillDialog(false)}>Abbrechen</Button>
                <Button onClick={handleBackfillSubmit}>Speichern</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDetail && selectedExcavation && (
          <ExcavationDetail
            excavation={selectedExcavation}
            priceItem={getSelectedPriceItem(selectedExcavation.price_item_id)}
            onClose={() => setShowDetail(false)}
            onEdit={handleEditFromDetail}
          />
        )}
      </AnimatePresence>
    </div>
  );
}