import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Lightbulb, Network, AlertTriangle, Plus, Download, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";

import VisioCanvas from "@/components/visio/VisioCanvas";
import NodeInfoPanel from "@/components/visio/NodeInfoPanel";
import ConnectionInfoPanel from "@/components/visio/ConnectionInfoPanel";
import AddNodeDialog from "@/components/visio/AddNodeDialog";
import AddConnectionDialog from "@/components/visio/AddConnectionDialog";
import SearchPanel from "@/components/visio/SearchPanel";

export default function FTTHVisioplanPage() {
  const location = useLocation();
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [showOnlyLight, setShowOnlyLight] = useState(false);
  const [showAddNodeDialog, setShowAddNodeDialog] = useState(false);
  const [showAddConnectionDialog, setShowAddConnectionDialog] = useState(false);
  const [highlightedElements, setHighlightedElements] = useState({ nodeIds: [], connectionIds: [] });
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const canvasRef = useRef(null);
  const svgExportRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: allNodes = [], isLoading: nodesLoading } = useQuery({
    queryKey: ['visio-nodes'],
    queryFn: () => base44.entities.VisioNode.list()
  });

  const { data: allConnections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ['visio-connections'],
    queryFn: () => base44.entities.VisioConnection.list()
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const projectIdFromUrl = urlParams.get("project");
    if (projectIdFromUrl && projects.length > 0) {
      setSelectedProjectId(projectIdFromUrl);
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId, location.search]);

  const nodes = allNodes.filter(n => n.project_id === selectedProjectId);
  const connections = allConnections.filter(c => c.project_id === selectedProjectId);

  const updateNodeMutation = useMutation({
    mutationFn: ({ nodeId, status }) => base44.entities.VisioNode.update(nodeId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['visio-nodes']);
      setSelectedNode(null);
      toast({ title: "Status aktualisiert", description: "Knoten-Status wurde geändert." });
    },
    onError: () => toast({ title: "Fehler", description: "Status konnte nicht geändert werden.", variant: "destructive" })
  });

  const createNodeMutation = useMutation({
    mutationFn: (nodeData) => base44.entities.VisioNode.create(nodeData),
    onSuccess: () => {
      queryClient.invalidateQueries(['visio-nodes']);
      setShowAddNodeDialog(false);
      toast({ title: "Knoten erstellt", description: "Neuer Knoten wurde hinzugefügt." });
    },
    onError: () => toast({ title: "Fehler", description: "Knoten konnte nicht erstellt werden.", variant: "destructive" })
  });

  const createConnectionMutation = useMutation({
    mutationFn: (connectionData) => base44.entities.VisioConnection.create(connectionData),
    onSuccess: () => {
      queryClient.invalidateQueries(['visio-connections']);
      setShowAddConnectionDialog(false);
      toast({ title: "Verbindung erstellt", description: "Neue Verbindung wurde hinzugefügt." });
    },
    onError: () => toast({ title: "Fehler", description: "Verbindung konnte nicht erstellt werden.", variant: "destructive" })
  });

  const deleteNodeMutation = useMutation({
    mutationFn: (nodeId) => base44.entities.VisioNode.delete(nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries(['visio-nodes']);
      setSelectedNode(null);
      toast({ title: "Knoten gelöscht" });
    },
    onError: () => toast({ title: "Fehler", description: "Knoten konnte nicht gelöscht werden.", variant: "destructive" })
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: (connectionId) => base44.entities.VisioConnection.delete(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['visio-connections']);
      setSelectedConnection(null);
      toast({ title: "Verbindung gelöscht" });
    },
    onError: () => toast({ title: "Fehler", description: "Verbindung konnte nicht gelöscht werden.", variant: "destructive" })
  });

  const handleNodeMove = async (nodeId, newX, newY) => {
    await base44.entities.VisioNode.update(nodeId, { position_x: newX, position_y: newY });
    queryClient.invalidateQueries(['visio-nodes']);
  };

  const handleConnectionStatusChange = async (connectionId, newStatus) => {
    await base44.entities.VisioConnection.update(connectionId, { status: newStatus });
    queryClient.invalidateQueries(['visio-connections']);
    setSelectedConnection(null);
  };

  const handleNodeClick = (node) => { setSelectedNode(node); setSelectedConnection(null); };
  const handleConnectionClick = (connection) => { setSelectedConnection(connection); setSelectedNode(null); };
  const handleStatusChange = (nodeId, newStatus) => updateNodeMutation.mutate({ nodeId, status: newStatus });

  const handleDownloadVisioplan = useCallback(() => {
    const svgEl = svgExportRef.current;
    if (!svgEl) return;
    const currentProject = projects.find(p => p.id === selectedProjectId);

    // Clone SVG and reset transform for clean export
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('style', '');
    clone.setAttribute('width', '1200');
    clone.setAttribute('height', '800');
    clone.setAttribute('viewBox', '0 0 1200 800');

    // Remove dashed PDF border rect from export
    const pdfRect = clone.querySelector('#pdf-export-border');
    if (pdfRect) pdfRect.remove();
    const pdfLabel = clone.querySelector('#pdf-export-label');
    if (pdfLabel) pdfLabel.remove();

    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 2400;
      canvas.height = 1600;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 2400, 1600);
      ctx.drawImage(img, 0, 0, 2400, 1600);
      URL.revokeObjectURL(url);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Visioplan – ${currentProject?.project_number || ''} ${currentProject?.title || ''}`, margin, margin - 2);
      pdf.addImage(imgData, 'PNG', margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);
      pdf.save(`Visioplan_${currentProject?.project_number || 'Export'}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "Download erfolgreich", description: "Visioplan wurde als PDF gespeichert." });
    };
    img.onerror = () => toast({ title: "Export fehlgeschlagen", variant: "destructive" });
    img.src = url;
  }, [projects, selectedProjectId, toast]);

  const stats = {
    hvtCount: nodes.filter(n => n.node_type === 'HVT').length,
    muffeCount: nodes.filter(n => n.node_type === 'MUFFE').length,
    nvtCount: nodes.filter(n => n.node_type === 'NVT').length,
    nvtLicht: nodes.filter(n => n.node_type === 'NVT' && n.status === 'LICHT').length,
    störungen: nodes.filter(n => n.status === 'STÖRUNG').length + connections.filter(c => c.status === 'STÖRUNG').length,
    totalCableLength: connections.reduce((sum, conn) => sum + (conn.length_meters || 0), 0)
  };

  const isLoading = projectsLoading || nodesLoading || connectionsLoading;
  const currentProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Network className="w-7 h-7 text-orange-500" />
              FTTH Visioplan
            </h1>
            {currentProject && (
              <p className="text-gray-500 text-sm mt-0.5">
                {currentProject.project_number} – {currentProject.title}
              </p>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Projekt-Auswahl */}
            <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Projekt auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_number} – {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedProjectId && (
              <>
                <Button onClick={() => setShowAddNodeDialog(true)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-1" /> Knoten
                </Button>
                <Button onClick={() => setShowAddConnectionDialog(true)} size="sm" className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-1" /> Verbindung
                </Button>
                <Button onClick={handleDownloadVisioplan} size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-1" /> PDF
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Statistik-Zeile + Legende + Filter in einer Leiste */}
        <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border px-4 py-3 shadow-sm">
          {/* Stats */}
          <div className="flex gap-3 flex-wrap">
            <StatChip label="HVT" value={stats.hvtCount} color="text-blue-600" />
            <StatChip label="Muffen" value={stats.muffeCount} color="text-purple-600" />
            <StatChip label="NVTs" value={stats.nvtCount} color="text-indigo-600" />
            <StatChip label="NVT mit Licht" value={stats.nvtLicht} color="text-green-600" />
            <StatChip label="Verbindungen" value={connections.length} color="text-gray-600" />
            <StatChip label="Kabellänge" value={`${stats.totalCableLength.toFixed(0)}m`} color="text-teal-600" />
            {stats.störungen > 0 && (
              <StatChip label="Störungen" value={stats.störungen} color="text-red-600" urgent />
            )}
          </div>

          <div className="h-6 w-px bg-gray-200 hidden md:block" />

          {/* Legende */}
          <div className="flex gap-2 text-xs">
            <LegendDot color="bg-gray-500" label="Dunkel" />
            <LegendDot color="bg-green-500" label="Licht" />
            <LegendDot color="bg-red-500" label="Störung" />
          </div>

          <div className="h-6 w-px bg-gray-200 hidden md:block" />

          {/* Filter-Toggle */}
          <div className="flex items-center gap-2">
            <Switch id="light-mode" checked={showOnlyLight} onCheckedChange={setShowOnlyLight} />
            <Label htmlFor="light-mode" className="cursor-pointer flex items-center gap-1 text-sm">
              <Lightbulb className="w-4 h-4 text-green-500" />
              Nur Lichtpfade
            </Label>
          </div>
        </div>

        {/* Canvas */}
        {isLoading ? (
          <div className="flex items-center justify-center h-[600px] bg-white rounded-xl border shadow-sm">
            <div className="text-center text-gray-400">
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-2" />
              <p>Lade Visioplan...</p>
            </div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex items-center justify-center h-[600px] bg-white rounded-xl border shadow-sm">
            <div className="text-center text-gray-400">
              <Network className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Kein Plan vorhanden</p>
              <p className="text-sm mt-1">Füge Knoten und Verbindungen hinzu, um zu starten.</p>
              <Button className="mt-4" onClick={() => setShowAddNodeDialog(true)}>
                <Plus className="w-4 h-4 mr-2" /> Ersten Knoten erstellen
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative" ref={canvasRef}>
            <VisioCanvas
              svgExportRef={svgExportRef}
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

        {/* Suchpanel */}
        <SearchPanel
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectChange={setSelectedProjectId}
        />

        {/* Hinweis-Box */}
        <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Bedienung:</strong> Mausrad zum Zoomen · Hintergrund ziehen zum Verschieben · Klick auf Knoten/Verbindung für Details · NVT auf „LICHT" aktiviert automatisch den gesamten Pfad zum HVT
          </span>
        </div>

        {/* Dialoge */}
        <AddNodeDialog
          open={showAddNodeDialog}
          onClose={() => setShowAddNodeDialog(false)}
          onSubmit={(nodeData) => createNodeMutation.mutate(nodeData)}
          projectId={selectedProjectId}
          existingNodes={nodes}
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

function StatChip({ label, value, color, urgent }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${urgent ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
      <span className={`font-bold ${color}`}>{value}</span>
      <span className="text-gray-500 text-xs">{label}</span>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-gray-600">{label}</span>
    </div>
  );
}