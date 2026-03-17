import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const NODE_TYPES = [
  { type: "HVT", label: "HVT", desc: "Hauptverteiler", color: "bg-blue-100 border-blue-300 text-blue-800" },
  { type: "MUFFE", label: "Muffe", desc: "Kabelmuffe", color: "bg-purple-100 border-purple-300 text-purple-800" },
  { type: "Ü-MUFFE", label: "Ü-Muffe", desc: "Übergangsmuffe", color: "bg-indigo-100 border-indigo-300 text-indigo-800" },
  { type: "NVT", label: "NVT", desc: "Netzverteiler", color: "bg-green-100 border-green-300 text-green-800" },
  { type: "KÜG", label: "KÜG", desc: "Kabelübergabe", color: "bg-orange-100 border-orange-300 text-orange-800" },
];

export default function AddNodeDialog({ open, onClose, onSubmit, projectId, existingNodes = [] }) {
  const getNextName = (type) => {
    const count = existingNodes.filter(n => n.node_type === type).length + 1;
    return `${type}-${String(count).padStart(3, '0')}`;
  };

  const handleSelect = (type) => {
    onSubmit({
      node_type: type,
      node_name: getNextName(type),
      position_x: 200 + Math.random() * 400,
      position_y: 150 + Math.random() * 300,
      status: "DUNKEL",
      additional_info: "",
      project_id: projectId
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Welchen Knotentyp?</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 py-2">
          {NODE_TYPES.map(({ type, label, desc, color }) => (
            <button
              key={type}
              onClick={() => handleSelect(type)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left hover:scale-[1.02] transition-transform ${color}`}
            >
              <span className="font-bold text-base w-16">{label}</span>
              <span className="text-sm opacity-70">{desc}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}