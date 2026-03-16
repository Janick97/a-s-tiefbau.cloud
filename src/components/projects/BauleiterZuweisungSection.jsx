import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { HardHat, Plus, User, X } from "lucide-react";

export default function BauleiterZuweisungSection({ project, bauleiter, onAssignBauleiter }) {
  const [selectedBauleiter, setSelectedBauleiter] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);

  const assignedBauleiter = project?.assigned_bauleiter || [];

  const handleAssign = async () => {
    if (selectedBauleiter.length === 0) {
      alert("Bitte wählen Sie mindestens einen Bauleiter aus");
      return;
    }
    const merged = [
      ...assignedBauleiter,
      ...selectedBauleiter.filter(s => !assignedBauleiter.some(a => a.id === s.id))
    ];
    await onAssignBauleiter(merged);
    setSelectedBauleiter([]);
    setIsSelecting(false);
  };

  return (
    <Card className="card-elevation border-none w-full h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardHat className="w-5 h-5 text-orange-600" />
          Bauleiter
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Zugewiesene Bauleiter</p>
            {assignedBauleiter.length > 0 ? (
              <div className="space-y-2 mb-3">
                {assignedBauleiter.map(bl => (
                  <div key={bl.id} className="flex items-center justify-between gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-orange-600" />
                      <span className="font-medium text-orange-800 text-sm">{bl.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-red-100"
                      onClick={() => onAssignBauleiter(assignedBauleiter.filter(b => b.id !== bl.id))}
                    >
                      <X className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-3">Noch keine Bauleiter zugewiesen</p>
            )}

            {!isSelecting ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsSelecting(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Bauleiter zuweisen
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="border rounded-lg p-3 bg-gray-50 space-y-2 max-h-48 overflow-y-auto">
                  {bauleiter.map(bl => {
                    const isAlreadyAssigned = assignedBauleiter.some(a => a.id === bl.id);
                    const isSelected = selectedBauleiter.some(s => s.id === bl.id);
                    return (
                      <div key={bl.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`bl-assign-${bl.id}`}
                          checked={isSelected}
                          disabled={isAlreadyAssigned}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedBauleiter([...selectedBauleiter, { id: bl.id, name: bl.full_name }]);
                            } else {
                              setSelectedBauleiter(selectedBauleiter.filter(s => s.id !== bl.id));
                            }
                          }}
                        />
                        <Label
                          htmlFor={`bl-assign-${bl.id}`}
                          className={`cursor-pointer text-sm ${isAlreadyAssigned ? 'text-gray-400' : ''}`}
                        >
                          {bl.full_name} {isAlreadyAssigned && '(bereits zugewiesen)'}
                        </Label>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setIsSelecting(false); setSelectedBauleiter([]); }}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                    onClick={handleAssign}
                    disabled={selectedBauleiter.length === 0}
                  >
                    Zuweisen
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}