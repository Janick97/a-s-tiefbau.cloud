import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function SearchPanel({ nodes, connections, onHighlight, onClearHighlight }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [nodeTypeFilter, setNodeTypeFilter] = useState("ALL");
  const [nodeStatusFilter, setNodeStatusFilter] = useState("ALL");
  const [connectionStatusFilter, setConnectionStatusFilter] = useState("ALL");
  const [cableTypeFilter, setCableTypeFilter] = useState("ALL");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState({ nodes: [], connections: [] });

  // Eindeutige Kabeltypen extrahieren
  const uniqueCableTypes = [...new Set(connections.map(c => c.cable_type).filter(Boolean))];

  const handleSearch = () => {
    const term = searchTerm.toLowerCase();
    
    // Knoten filtern
    const filteredNodes = nodes.filter(node => {
      const matchesSearch = !term || 
        node.node_name.toLowerCase().includes(term) ||
        node.node_type.toLowerCase().includes(term) ||
        (node.additional_info && node.additional_info.toLowerCase().includes(term));
      
      const matchesType = nodeTypeFilter === "ALL" || node.node_type === nodeTypeFilter;
      const matchesStatus = nodeStatusFilter === "ALL" || node.status === nodeStatusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    });

    // Verbindungen filtern
    const filteredConnections = connections.filter(conn => {
      const matchesSearch = !term || 
        conn.cable_type.toLowerCase().includes(term) ||
        (conn.notes && conn.notes.toLowerCase().includes(term));
      
      const matchesStatus = connectionStatusFilter === "ALL" || conn.status === connectionStatusFilter;
      const matchesCableType = cableTypeFilter === "ALL" || conn.cable_type === cableTypeFilter;
      
      return matchesSearch && matchesStatus && matchesCableType;
    });

    setResults({ nodes: filteredNodes, connections: filteredConnections });
    onHighlight({
      nodeIds: filteredNodes.map(n => n.id),
      connectionIds: filteredConnections.map(c => c.id)
    });
  };

  const handleClear = () => {
    setSearchTerm("");
    setNodeTypeFilter("ALL");
    setNodeStatusFilter("ALL");
    setConnectionStatusFilter("ALL");
    setCableTypeFilter("ALL");
    setResults({ nodes: [], connections: [] });
    onClearHighlight();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Suche & Filter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Suche nach Name, Typ, Kabeltyp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch}>
            <Search className="w-4 h-4" />
          </Button>
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              <Filter className="w-4 h-4 mr-2" />
              Filter {isOpen ? "verbergen" : "anzeigen"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Knotentyp</label>
                <Select value={nodeTypeFilter} onValueChange={setNodeTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Alle</SelectItem>
                    <SelectItem value="HVT">HVT</SelectItem>
                    <SelectItem value="MUFFE">Muffe</SelectItem>
                    <SelectItem value="NVT">NVT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Knoten-Status</label>
                <Select value={nodeStatusFilter} onValueChange={setNodeStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Alle</SelectItem>
                    <SelectItem value="DUNKEL">Dunkel</SelectItem>
                    <SelectItem value="LICHT">Licht</SelectItem>
                    <SelectItem value="STÖRUNG">Störung</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Verbindungs-Status</label>
                <Select value={connectionStatusFilter} onValueChange={setConnectionStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Alle</SelectItem>
                    <SelectItem value="KEINE_VERBINDUNG">Keine Verbindung</SelectItem>
                    <SelectItem value="UNTER_LICHT">Unter Licht</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Kabeltyp</label>
                <Select value={cableTypeFilter} onValueChange={setCableTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Alle</SelectItem>
                    {uniqueCableTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {(results.nodes.length > 0 || results.connections.length > 0) && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Suchergebnisse</h4>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="w-4 h-4 mr-1" />
                Zurücksetzen
              </Button>
            </div>
            
            {results.nodes.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  {results.nodes.length} Knoten gefunden
                </p>
                <div className="flex flex-wrap gap-1">
                  {results.nodes.slice(0, 10).map(node => (
                    <Badge key={node.id} variant="outline" className="text-xs">
                      {node.node_name}
                    </Badge>
                  ))}
                  {results.nodes.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{results.nodes.length - 10} weitere
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {results.connections.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  {results.connections.length} Verbindungen gefunden
                </p>
                <div className="flex flex-wrap gap-1">
                  {results.connections.slice(0, 10).map(conn => (
                    <Badge key={conn.id} variant="outline" className="text-xs">
                      {conn.cable_type}
                    </Badge>
                  ))}
                  {results.connections.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{results.connections.length - 10} weitere
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}