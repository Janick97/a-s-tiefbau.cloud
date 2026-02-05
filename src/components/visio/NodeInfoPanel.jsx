import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

export default function NodeInfoPanel({ node, connections, onClose, onStatusChange }) {
  const [newStatus, setNewStatus] = React.useState(node?.status || 'DUNKEL');

  if (!node) return null;

  const connectedConnections = connections.filter(
    c => c.from_node_id === node.id || c.to_node_id === node.id
  );

  const statusColors = {
    DUNKEL: 'bg-gray-500',
    LICHT: 'bg-green-500',
    STÖRUNG: 'bg-red-500'
  };

  const typeLabels = {
    HVT: 'Hauptverteiler',
    MUFFE: 'Muffe',
    NVT: 'Netzverteiler'
  };

  return (
    <Card className="absolute top-4 right-4 w-80 shadow-2xl z-10">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">Knotendetails</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Typ</p>
          <Badge variant="outline" className="text-sm">{typeLabels[node.node_type]}</Badge>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-1">Bezeichnung</p>
          <p className="font-semibold text-lg">{node.node_name}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-2">Status ändern</p>
          <div className="flex gap-2">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DUNKEL">DUNKEL</SelectItem>
                <SelectItem value="LICHT">LICHT</SelectItem>
                <SelectItem value="STÖRUNG">STÖRUNG</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              size="sm"
              onClick={() => onStatusChange(node.id, newStatus)}
              disabled={newStatus === node.status}
            >
              Ändern
            </Button>
          </div>
          <div className="mt-2">
            <Badge className={statusColors[node.status]}>{node.status}</Badge>
          </div>
        </div>

        {node.additional_info && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Zusatzinfo</p>
            <p className="text-sm">{node.additional_info}</p>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-500 mb-2">Verbindungen ({connectedConnections.length})</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {connectedConnections.map(conn => (
              <div key={conn.id} className="text-xs bg-gray-50 p-2 rounded">
                <p className="font-medium">{conn.cable_type}</p>
                {conn.length_meters && (
                  <p className="text-gray-600">{conn.length_meters}m</p>
                )}
                <Badge className={`mt-1 ${statusColors[conn.status]} text-xs`}>
                  {conn.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-500 pt-2 border-t">
          <p>Position: X={Math.round(node.position_x)}, Y={Math.round(node.position_y)}</p>
        </div>
      </CardContent>
    </Card>
  );
}