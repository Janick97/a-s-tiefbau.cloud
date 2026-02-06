import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Lightbulb, Network, AlertTriangle, ZoomIn, ZoomOut, Plus, Download } from "lucide-react";
import html2canvas from "html2canvas";

import VisioCanvas from "@/components/visio/VisioCanvas";
import NodeInfoPanel from "@/components/visio/NodeInfoPanel";
import ConnectionInfoPanel from "@/components/visio/ConnectionInfoPanel";
import AddNodeDialog from "@/components/visio/AddNodeDialog";
import AddConnectionDialog from "@/components/visio/AddConnectionDialog";
import SearchPanel from "@/components/visio/SearchPanel";

export default function FTTHVisioplanPage() {
  const location = useLocation();
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [showOnlyLight, setShowOnlyLight] = useState(false);
  const [showAddNodeDialog, setShowAddNodeDialog] = useState(false);
  const [showAddConnectionDialog, setShowAddConnectionDialog] = useState(false);
  const [highlightedElements, setHighlightedElements] = useState({ nodeIds: [], connectionIds: [] });

  const queryClient = useQueryClient();

  // Projekte laden
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  // Knoten laden
  const { data: allNodes = [], isLoading: nodesLoading } = useQuery({
    queryKey: ['visio-nodes'],
    queryFn: () => base44.entities.VisioNode.list()
  });

  // Verbindungen laden
  const { data: allConnections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ['visio-connections'],
    queryFn: () => base44.entities.VisioConnection.list()
  });

  // Automatisch Projekt aus URL-Parameter oder erstes Projekt auswählen
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const projectIdFromUrl = urlParams.get("project");
    
    if (projectIdFromUrl && projects.length > 0) {
      setSelectedProjectId(projectIdFromUrl);
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId, location.search]);

  // Gefilterte Daten für aktuelles Projekt
  const nodes = allNodes.filter(n => n.project_id === selectedProjectId);
  const connections = allConnections.filter(c => c.project_id === selectedProjectId);

  // Status ändern Mutation
  const updateNodeMutation = useMutation({
    mutationFn: ({ nodeId, status }) => base44.entities.VisioNode.update(nodeId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['visio-nodes']);
      setSelectedNode(null);
    }
  });

  // Knoten erstellen Mutation
  const createNodeMutation = useMutation({
    mutationFn: (nodeData) => base44.entities.VisioNode.create(nodeData),
    onSuccess: () => {
      queryClient.invalidateQueries(['visio-nodes']);
      setShowAddNodeDialog(false);
    }
  });

  // Verbindung erstellen Mutation
  const createConnectionMutation = useMutation({
    mutationFn: (connectionData) => base44.entities.VisioConnection.create(connectionData),
    onSuccess: () => {
      queryClient.invalidateQueries(['visio-connections']);
      setShowAddConnectionDialog(false);
    }
  });

  // Knoten löschen Mutation
  const deleteNodeMutation = useMutation({
    mutationFn: (nodeId) => base44.entities.VisioNode.delete(nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries(['visio-nodes']);
      setSelectedNode(null);
    }
  });

  // Verbindung löschen Mutation
  const deleteConnectionMutation = useMutation({
    mutationFn: (connectionId) => base44.entities.VisioConnection.delete(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['visio-connections']);
      setSelectedConnection(null);
    }
  });

  // Knoten Position ändern
  const handleNodeMove = async (nodeId, newX, newY) => {
    await base44.entities.VisioNode.update(nodeId, {
      position_x: newX,
      position_y: newY
    });
    queryClient.invalidateQueries(['visio-nodes']);
  };

  // Verbindung Status ändern
  const handleConnectionStatusChange = async (connectionId, newStatus) => {
    await base44.entities.VisioConnection.update(connectionId, { status: newStatus });
    queryClient.invalidateQueries(['visio-connections']);
    setSelectedConnection(null);
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    setSelectedConnection(null);
  };

  const handleConnectionClick = (connection) => {
    setSelectedConnection(connection);
    setSelectedNode(null);
  };

  const handleStatusChange = (nodeId, newStatus) => {
    updateNodeMutation.mutate({ nodeId, status: newStatus });
  };

  const handleDownloadVisioplan = async () => {
    const canvasElement = document.querySelector('.relative.w-full.h-\\[600px\\]');
    if (!canvasElement) return;

    try {
      const canvas = await html2canvas(canvasElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });
      
      const link = document.createElement('a');
      const currentProject = projects.find(p => p.id === selectedProjectId);
      link.download = `Visioplan_${currentProject?.project_number || 'Export'}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Download fehlgeschlagen:', error);
      alert('Fehler beim Download des Visioplans');
    }
  };

  // Statistiken berechnen
  const stats = {
    totalNodes: nodes.length,
    hvtCount: nodes.filter(n => n.node_type === 'HVT').length,
    muffeCount: nodes.filter(n => n.node_type === 'MUFFE').length,
    nvtCount: nodes.filter(n => n.node_type === 'NVT').length,
    nvtLicht: nodes.filter(n => n.node_type === 'NVT' && n.status === 'LICHT').length,
    störungen: nodes.filter(n => n.status === 'STÖRUNG').length + connections.filter(c => c.status === 'STÖRUNG').length
  };

  const isLoading = projectsLoading || nodesLoading || connectionsLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Network className="w-8 h-8 text-orange-500" />
              FTTH Visioplan
            </h1>
            <p className="text-gray-600 mt-1">Digitaler Netzplan für Glasfaser-Projekte</p>
          </div>

          {selectedProjectId && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowAddNodeDialog(true)}
                className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Knoten
              </Button>
              <Button
                onClick={() => setShowAddConnectionDialog(true)}
                className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Verbindung
              </Button>
              <Button
                onClick={handleDownloadVisioplan}
                variant="outline"
                className="bg-white">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          )}
        </div>

        {/* Statistik-Karten */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.hvtCount}</p>
                <p className="text-xs text-gray-600 mt-1">HVT</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.muffeCount}</p>
                <p className="text-xs text-gray-600 mt-1">Muffen</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{stats.nvtCount}</p>
                <p className="text-xs text-gray-600 mt-1">NVTs</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.nvtLicht}</p>
                <p className="text-xs text-gray-600 mt-1">NVTs mit Licht</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{connections.length}</p>
                <p className="text-xs text-gray-600 mt-1">Verbindungen</p>
              </div>
            </CardContent>
          </Card>

          <Card className={stats.störungen > 0 ? 'border-red-300 bg-red-50' : ''}>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{stats.störungen}</p>
                <p className="text-xs text-gray-600 mt-1">Störungen</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Steuerung */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="light-mode"
                  checked={showOnlyLight}
                  onCheckedChange={setShowOnlyLight}
                />
                <Label htmlFor="light-mode" className="cursor-pointer flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-green-500" />
                  Nur aktive Lichtpfade anzeigen
                </Label>
              </div>

              <div className="flex gap-2 text-xs">
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded">
                  <div className="w-3 h-3 bg-gray-500 rounded"></div>
                  <span>Dunkel</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 rounded">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Geplant</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Licht</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-red-50 rounded">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Störung</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Canvas */}
        {isLoading ? (
          <Card>
            <CardContent className="h-[600px] flex items-center justify-center">
              <p className="text-gray-500">Lade Visioplan...</p>
            </CardContent>
          </Card>
        ) : nodes.length === 0 ? (
          <Card>
            <CardContent className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <Network className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Keine Knoten für dieses Projekt vorhanden.</p>
                <p className="text-sm text-gray-400 mt-2">Erstellen Sie Knoten und Verbindungen, um den Plan anzuzeigen.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            <VisioCanvas
              nodes={nodes}
              connections={connections}
              onNodeClick={handleNodeClick}
              onConnectionClick={handleConnectionClick}
              showOnlyLight={showOnlyLight}
              onNodeMove={handleNodeMove}
              highlightedNodes={highlightedElements.nodeIds}
              highlightedConnections={highlightedElements.connectionIds}
            />

            {selectedNode && (
              <NodeInfoPanel
                node={selectedNode}
                connections={connections}
                onClose={() => setSelectedNode(null)}
                onStatusChange={handleStatusChange}
                onDelete={(nodeId) => deleteNodeMutation.mutate(nodeId)}
              />
            )}

            {selectedConnection && (
              <ConnectionInfoPanel
                connection={selectedConnection}
                nodes={nodes}
                onClose={() => setSelectedConnection(null)}
                onDelete={(connectionId) => deleteConnectionMutation.mutate(connectionId)}
                onStatusChange={handleConnectionStatusChange}
              />
            )}
          </div>
        )}

        {/* Hinweise */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-2">Bedienung:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Mausrad: Zoom in/out</li>
                  <li>Ziehen: Plan verschieben</li>
                  <li>Klick auf Knoten/Verbindung: Details anzeigen</li>
                  <li>NVT auf "LICHT" setzen aktiviert automatisch den gesamten Pfad zum HVT</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suchpanel */}
        <SearchPanel
          nodes={nodes}
          connections={connections}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectChange={setSelectedProjectId}
          onHighlight={(elements) => setHighlightedElements(elements)}
          onClearHighlight={() => setHighlightedElements({ nodeIds: [], connectionIds: [] })}
        />

        {/* Dialoge */}
        <AddNodeDialog
          open={showAddNodeDialog}
          onClose={() => setShowAddNodeDialog(false)}
          onSubmit={(nodeData) => createNodeMutation.mutate(nodeData)}
          projectId={selectedProjectId}
        />

        <AddConnectionDialog
          open={showAddConnectionDialog}
          onClose={() => setShowAddConnectionDialog(false)}
          onSubmit={(connectionData) => createConnectionMutation.mutate(connectionData)}
          projectId={selectedProjectId}
          nodes={nodes}
        />
      </div>
    </div>
  );
}