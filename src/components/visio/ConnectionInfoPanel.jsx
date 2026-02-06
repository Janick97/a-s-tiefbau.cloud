import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Trash2 } from "lucide-react";

export default function ConnectionInfoPanel({ connection, nodes, onClose, onDelete, onStatusChange }) {
  const [newStatus, setNewStatus] = React.useState(connection?.status || 'KEINE_VERBINDUNG');
  
  if (!connection) return null;

  const fromNode = nodes.find(n => n.id === connection.from_node_id);
  const toNode = nodes.find(n => n.id === connection.to_node_id);

  const statusColors = {
    KEINE_VERBINDUNG: 'bg-red-500 text-white',
    UNTER_LICHT: 'bg-green-500 text-white shadow-lg shadow-green-500/50'
  };

  return (
    <Card className="absolute top-4 left-4 w-80 shadow-2xl z-10">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">Verbindungsdetails</CardTitle>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => {
            if (confirm('Möchten Sie diese Verbindung wirklich löschen?')) {
              onDelete(connection.id);
            }
          }} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Kabeltyp</p>
          <p className="font-semibold text-lg">{connection.cable_type}</p>
        </div>

        {connection.length_meters && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Länge</p>
            <p className="font-semibold">{connection.length_meters} Meter</p>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-500 mb-2">Status ändern</p>
          <div className="flex gap-2">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KEINE_VERBINDUNG">Keine Verbindung</SelectItem>
                <SelectItem value="UNTER_LICHT">Unter Licht</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              size="sm"
              onClick={() => onStatusChange(connection.id, newStatus)}
              disabled={newStatus === connection.status}
            >
              Ändern
            </Button>
          </div>
          <div className="mt-2">
            <Badge className={statusColors[connection.status]}>{connection.status}</Badge>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-sm text-gray-500 mb-2">Verbindung</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">Von:</span>
              <span className="text-sm font-semibold">{fromNode?.node_name || 'Unbekannt'}</span>
              <Badge variant="outline" className="text-xs">{fromNode?.node_type}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">Zu:</span>
              <span className="text-sm font-semibold">{toNode?.node_name || 'Unbekannt'}</span>
              <Badge variant="outline" className="text-xs">{toNode?.node_type}</Badge>
            </div>
          </div>
        </div>

        {connection.notes && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Notizen</p>
            <p className="text-sm text-gray-700">{connection.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}