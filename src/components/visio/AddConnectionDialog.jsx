import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CABLE_TYPES = ["2x12 Minikabel", "8x12 Minikabel", "6R/22", "12R/44"];

export default function AddConnectionDialog({ open, onClose, onSubmit, projectId, nodes }) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [cableType, setCableType] = useState(CABLE_TYPES[0]);

  const handleSubmit = () => {
    if (!fromId || !toId || fromId === toId) return;
    onSubmit({
      from_node_id: fromId,
      to_node_id: toId,
      cable_type: cableType,
      length_meters: 0,
      status: "KEINE_VERBINDUNG",
      notes: "",
      project_id: projectId
    });
    setFromId(""); setToId(""); setCableType(CABLE_TYPES[0]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Verbindung erstellen</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Von</Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger><SelectValue placeholder="Startknoten..." /></SelectTrigger>
              <SelectContent>
                {nodes.map(n => (
                  <SelectItem key={n.id} value={n.id}>{n.node_type} – {n.node_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Nach</Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger><SelectValue placeholder="Zielknoten..." /></SelectTrigger>
              <SelectContent>
                {nodes.filter(n => n.id !== fromId).map(n => (
                  <SelectItem key={n.id} value={n.id}>{n.node_type} – {n.node_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Kabeltyp</Label>
            <Select value={cableType} onValueChange={setCableType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CABLE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={!fromId || !toId || fromId === toId}>
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}