import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Wrench, Plus, ExternalLink, User, CheckCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MontageAuftragSection({ project, montageAuftrag, monteure, onCreateMontageAuftrag, onAssignMonteur }) {
  const [selectedMonteure, setSelectedMonteure] = useState([]);
  const [isSelectingMonteure, setIsSelectingMonteure] = useState(false);

  const assignedMonteure = montageAuftrag?.assigned_monteure || [];

  const handleAssignMonteure = async () => {
    if (selectedMonteure.length === 0) {
      alert("Bitte wählen Sie mindestens einen Monteur aus");
      return;
    }

    await onAssignMonteur(selectedMonteure);
    setSelectedMonteure([]);
    setIsSelectingMonteure(false);
  };

  return (
    <Card className="card-elevation border-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-blue-600" />
          Montageauftrag
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!montageAuftrag ? (
          <div className="text-center py-6">
            <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 mb-4">Für dieses Projekt existiert noch kein Montageauftrag.</p>
            <Button onClick={onCreateMontageAuftrag} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Montageauftrag erstellen
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">SM-Nummer</p>
                <p className="font-semibold text-gray-900">{montageAuftrag.sm_number}</p>
              </div>
              <div className="flex gap-2">
                {montageAuftrag.tiefbau_offen && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    Tiefbau offen
                  </Badge>
                )}
                {montageAuftrag.monteur_completed && (
                  <Badge className="bg-red-100 text-red-800 border-red-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Montage fertig
                  </Badge>
                )}
                <Badge className={
                  montageAuftrag.status === 'Montage fertig' || montageAuftrag.status === 'Abgeschlossen'
                    ? 'bg-green-100 text-green-800'
                    : montageAuftrag.status === 'In Bearbeitung'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }>
                  {montageAuftrag.status}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Zugewiesene Monteure</p>
              {assignedMonteure.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {assignedMonteure.map(monteur => (
                    <div key={monteur.id} className="flex items-center justify-between gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-800 text-sm">{monteur.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-red-100"
                        onClick={() => onAssignMonteur(assignedMonteure.filter(m => m.id !== monteur.id))}
                      >
                        <X className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-3">Noch keine Monteure zugewiesen</p>
              )}

              {!isSelectingMonteure ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsSelectingMonteure(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Monteure zuweisen
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="border rounded-lg p-3 bg-gray-50 space-y-2 max-h-48 overflow-y-auto">
                    {monteure.map(monteur => {
                      const isAlreadyAssigned = assignedMonteure.some(m => m.id === monteur.id);
                      const isSelected = selectedMonteure.some(m => m.id === monteur.id);
                      return (
                        <div key={monteur.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`monteur-assign-${monteur.id}`}
                            checked={isSelected}
                            disabled={isAlreadyAssigned}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedMonteure([...selectedMonteure, { id: monteur.id, name: monteur.full_name }]);
                              } else {
                                setSelectedMonteure(selectedMonteure.filter(m => m.id !== monteur.id));
                              }
                            }}
                          />
                          <Label
                            htmlFor={`monteur-assign-${monteur.id}`}
                            className={`cursor-pointer text-sm ${isAlreadyAssigned ? 'text-gray-400' : ''}`}
                          >
                            {monteur.full_name} {isAlreadyAssigned && '(bereits zugewiesen)'}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setIsSelectingMonteure(false);
                        setSelectedMonteure([]);
                      }}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleAssignMonteure}
                      disabled={selectedMonteure.length === 0}
                    >
                      Zuweisen
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Link to={createPageUrl("MontageAuftraege")}>
              <Button variant="outline" className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" />
                In Montageaufträgen öffnen
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}