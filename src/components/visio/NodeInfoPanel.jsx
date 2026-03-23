import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Trash2, Pencil, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function NodeInfoPanel({ node, connections, onClose, onStatusChange, onDelete }) {
  const [newStatus, setNewStatus] = useState(node?.status || 'DUNKEL');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(node?.node_name || '');
  const [displayName, setDisplayName] = useState(node?.node_name || '');
  const queryClient = useQueryClient();

  if (!node) return null;

  const connectedConnections = connections.filter(
    c => c.from_node_id === node.id || c.to_node_id === node.id
  );

  const statusColors = { DUNKEL: 'bg-gray-500', LICHT: 'bg-green-500', STÖRUNG: 'bg-red-500' };

  const handleSaveName = async () => {
    if (!nameValue.trim()) { setEditingName(false); return; }
    if (nameValue.trim() === displayName) { setEditingName(false); return; }
    await base44.entities.VisioNode.update(node.id, { node_name: nameValue.trim() });
    setDisplayName(nameValue.trim());
    queryClient.invalidateQueries(['visio-nodes']);
    setEditingName(false);
  };

  return (
    <Card className="absolute top-4 right-4 w-72 shadow-2xl z-10">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4">
        <Badge variant="outline" className="text-xs">{node.node_type}</Badge>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50"
            onClick={() => { if (confirm('Knoten wirklich löschen?')) onDelete(node.id); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {/* Editierbarer Name */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Bezeichnung</p>
          {editingName ? (
            <div className="flex gap-1">
              <Input
                className="h-8 text-sm font-semibold"
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                autoFocus
              />
              <Button size="icon" className="h-8 w-8" onClick={handleSaveName}><Check className="w-4 h-4" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">{displayName}</span>
              <button onClick={() => { setNameValue(displayName); setEditingName(true); }}
                className="text-gray-400 hover:text-gray-700 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Status */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Status</p>
          <div className="flex gap-2">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DUNKEL">Dunkel</SelectItem>
                <SelectItem value="LICHT">Licht</SelectItem>
                <SelectItem value="STÖRUNG">Störung</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8" onClick={() => onStatusChange(node.id, newStatus)} disabled={newStatus === node.status}>
              OK
            </Button>
          </div>
        </div>

        {/* Verbindungen */}
        {connectedConnections.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Verbindungen ({connectedConnections.length})</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {connectedConnections.map(conn => (
                <div key={conn.id} className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1.5 rounded">
                  <span className="font-medium">{conn.cable_type}</span>
                  <div className="flex items-center gap-1.5">
                    {conn.length_meters > 0 && <span className="text-gray-500">{conn.length_meters}m</span>}
                    <span className={`w-2 h-2 rounded-full ${conn.status === 'UNTER_LICHT' ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}