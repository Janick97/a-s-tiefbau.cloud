import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function AddNodeDialog({ open, onClose, onSubmit, projectId }) {
  const [formData, setFormData] = useState({
    node_type: "MUFFE",
    node_name: "",
    position_x: 400,
    position_y: 300,
    status: "DUNKEL",
    additional_info: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      project_id: projectId
    });
    setFormData({
      node_type: "MUFFE",
      node_name: "",
      position_x: 400,
      position_y: 300,
      status: "DUNKEL",
      additional_info: ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neuen Knoten hinzufügen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Knotentyp</Label>
              <Select
                value={formData.node_type}
                onValueChange={(value) => setFormData({ ...formData, node_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HVT">HVT (Hauptverteiler)</SelectItem>
                  <SelectItem value="MUFFE">Muffe</SelectItem>
                  <SelectItem value="NVT">NVT (Nahverteiler)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Knotenname *</Label>
              <Input
                required
                placeholder="z.B. HVT-001, M-034, NVT-112"
                value={formData.node_name}
                onChange={(e) => setFormData({ ...formData, node_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Position X</Label>
                <Input
                  type="number"
                  value={formData.position_x}
                  onChange={(e) => setFormData({ ...formData, position_x: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Position Y</Label>
                <Input
                  type="number"
                  value={formData.position_y}
                  onChange={(e) => setFormData({ ...formData, position_y: parseFloat(e.target.value) })}
                />
              </div>
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
                  <SelectItem value="LICHT">Licht</SelectItem>
                  <SelectItem value="STÖRUNG">Störung</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Zusätzliche Informationen</Label>
              <Textarea
                placeholder="Optionale Details..."
                value={formData.additional_info}
                onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit">Knoten erstellen</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}