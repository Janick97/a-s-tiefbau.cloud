import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function AddConnectionDialog({ open, onClose, onSubmit, projectId, nodes }) {
  const [formData, setFormData] = useState({
    from_node_id: "",
    to_node_id: "",
    cable_type: "",
    length_meters: 0,
    status: "KEINE_VERBINDUNG",
    notes: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      project_id: projectId
    });
    setFormData({
      from_node_id: "",
      to_node_id: "",
      cable_type: "",
      length_meters: 0,
      status: "KEINE_VERBINDUNG",
      notes: ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neue Verbindung hinzufügen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Von Knoten *</Label>
              <Select
                required
                value={formData.from_node_id}
                onValueChange={(value) => setFormData({ ...formData, from_node_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Startknoten wählen" />
                </SelectTrigger>
                <SelectContent>
                  {nodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.node_type} - {node.node_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Zu Knoten *</Label>
              <Select
                required
                value={formData.to_node_id}
                onValueChange={(value) => setFormData({ ...formData, to_node_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Zielknoten wählen" />
                </SelectTrigger>
                <SelectContent>
                  {nodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.node_type} - {node.node_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Kabeltyp *</Label>
              <Input
                required
                placeholder="z.B. 6R/22, 12R/44"
                value={formData.cable_type}
                onChange={(e) => setFormData({ ...formData, cable_type: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Länge (Meter)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.length_meters}
                onChange={(e) => setFormData({ ...formData, length_meters: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DUNKEL">Dunkel</SelectItem>
                  <SelectItem value="GEPLANT">Geplant</SelectItem>
                  <SelectItem value="LICHT">Licht</SelectItem>
                  <SelectItem value="STÖRUNG">Störung</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notizen</Label>
              <Textarea
                placeholder="Optionale Anmerkungen..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit">Verbindung erstellen</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}