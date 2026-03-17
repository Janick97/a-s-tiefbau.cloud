import React, { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VisioCanvas({ nodes, connections, onNodeClick, onConnectionClick, showOnlyLight, onNodeMove, highlightedNodes = [], highlightedConnections = [] }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState(null);
  const [zoomLocked, setZoomLocked] = useState(true); // Zoom standardmäßig gesperrt

  // Zoom per Ctrl+Scroll ODER wenn zoomLocked=false per normalem Scroll
  const handleWheel = useCallback((e) => {
    const shouldZoom = !zoomLocked || e.ctrlKey || e.metaKey;
    if (!shouldZoom) return; // normales Scrollen der Seite zulassen
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    setTransform(prev => ({
      ...prev,
      scale: Math.min(Math.max(0.2, prev.scale + delta), 4)
    }));
  }, [zoomLocked]);

  // wheel listener mit passive:false damit preventDefault funktioniert
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = (e) => {
    if (e.target.tagName === 'svg' || (e.target.tagName === 'rect' && e.target.id === 'background')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (draggingNode) {
      const svg = svgRef.current;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
      setDraggingNode(prev => ({ ...prev, position_x: svgP.x, position_y: svgP.y }));
    } else if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  }, [draggingNode, isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    if (draggingNode && onNodeMove) {
      onNodeMove(draggingNode.id, draggingNode.position_x, draggingNode.position_y);
    }
    setIsDragging(false);
    setDraggingNode(null);
  }, [draggingNode, onNodeMove]);

  useEffect(() => {
    if (isDragging || draggingNode) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, draggingNode, handleMouseMove, handleMouseUp]);

  const handleNodeMouseDown = (e, node) => {
    e.stopPropagation();
    setDraggingNode(node);
  };

  const zoomIn = () => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.2, 4) }));
  const zoomOut = () => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.2, 0.2) }));
  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 });

  // Verbindungen filtern
  const visibleConnections = showOnlyLight
    ? connections.filter(c => c.status === 'UNTER_LICHT')
    : connections;

  const getConnectionStyle = (connection) => {
    const isHighlighted = highlightedConnections.length > 0 && highlightedConnections.includes(connection.id);
    const isLight = connection.status === 'UNTER_LICHT';
    return {
      stroke: isHighlighted ? '#f59e0b' : isLight ? '#10b981' : '#ef4444',
      strokeWidth: isHighlighted ? 4 : isLight ? 3 : 2,
      fill: 'none',
      filter: isHighlighted ? 'drop-shadow(0 0 6px #f59e0b)' : isLight ? 'drop-shadow(0 0 4px #10b981)' : undefined
    };
  };

  const getNodeColor = (node) => {
    if (highlightedNodes.length > 0 && highlightedNodes.includes(node.id)) return '#f59e0b';
    if (node.status === 'LICHT') return '#10b981';
    if (node.status === 'STÖRUNG') return '#ef4444';
    return '#3b82f6';
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[650px] bg-gray-50 rounded-xl border-2 border-gray-200 overflow-hidden"
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox="0 0 1200 800"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          transition: isDragging || draggingNode ? 'none' : 'transform 0.1s'
        }}
      >
        <rect id="background" width="1200" height="800" fill="transparent" />

        {/* Verbindungen */}
        <g>
          {visibleConnections.map(conn => {
            const fromNode = nodes.find(n => n.id === conn.from_node_id);
            const toNode = nodes.find(n => n.id === conn.to_node_id);
            if (!fromNode || !toNode) return null;
            const midX = (fromNode.position_x + toNode.position_x) / 2;
            const midY = (fromNode.position_y + toNode.position_y) / 2;
            return (
              <g key={conn.id}>
                <line
                  x1={fromNode.position_x} y1={fromNode.position_y}
                  x2={toNode.position_x} y2={toNode.position_y}
                  {...getConnectionStyle(conn)}
                  className="cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onConnectionClick(conn); }}
                />
                <text x={midX} y={midY - 5} textAnchor="middle" fontSize="10" fill="#374151" fontWeight="600"
                  className="pointer-events-none" stroke="white" strokeWidth="3" paintOrder="stroke fill">
                  {conn.cable_type}
                </text>
                {conn.length_meters > 0 && (
                  <text x={midX} y={midY + 8} textAnchor="middle" fontSize="9" fill="#6b7280"
                    className="pointer-events-none" stroke="white" strokeWidth="2" paintOrder="stroke fill">
                    {conn.length_meters}m
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Knoten */}
        <g>
          {nodes.map(node => {
            const dn = draggingNode && draggingNode.id === node.id ? draggingNode : node;
            const color = getNodeColor(dn);
            const isHighlighted = highlightedNodes.length > 0 && highlightedNodes.includes(node.id);
            const stroke = isHighlighted ? "#f59e0b" : "#1f2937";
            const sw = isHighlighted ? "3" : "2";

            return (
              <g key={node.id}
                className="cursor-move"
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onClick={(e) => { e.stopPropagation(); if (!draggingNode) onNodeClick(node); }}
                style={isHighlighted ? { filter: 'drop-shadow(0 0 8px #f59e0b)' } : {}}
              >
                {dn.node_type === 'HVT' && (
                  <>
                    <rect x={dn.position_x - 40} y={dn.position_y - 25} width="80" height="50"
                      fill={color} stroke={stroke} strokeWidth={sw} rx="5" />
                    <text x={dn.position_x} y={dn.position_y} textAnchor="middle" dominantBaseline="middle"
                      fill="white" fontSize="11" fontWeight="bold" className="pointer-events-none">
                      {dn.node_name}
                    </text>
                  </>
                )}
                {(dn.node_type === 'MUFFE' || dn.node_type === 'Ü-MUFFE') && (
                  <>
                    <circle cx={dn.position_x} cy={dn.position_y} r="18"
                      fill={color} stroke={stroke} strokeWidth={sw}
                      strokeDasharray={dn.node_type === 'Ü-MUFFE' ? "5,3" : undefined} />
                    <text x={dn.position_x} y={dn.position_y + 30} textAnchor="middle"
                      fontSize="10" fill="#374151" fontWeight="500" className="pointer-events-none"
                      stroke="white" strokeWidth="2" paintOrder="stroke fill">
                      {dn.node_name}
                    </text>
                  </>
                )}
                {dn.node_type === 'NVT' && (
                  <>
                    <rect x={dn.position_x - 14} y={dn.position_y - 14} width="28" height="28"
                      fill={color} stroke={stroke} strokeWidth={sw} rx="2" />
                    <text x={dn.position_x} y={dn.position_y + 24} textAnchor="middle"
                      fontSize="9" fill="#374151" fontWeight="500" className="pointer-events-none"
                      stroke="white" strokeWidth="2" paintOrder="stroke fill">
                      {dn.node_name}
                    </text>
                  </>
                )}
                {dn.node_type === 'KÜG' && (
                  <>
                    <rect x={dn.position_x - 16} y={dn.position_y - 16} width="32" height="32"
                      fill={color} stroke={stroke} strokeWidth={sw} rx="5" />
                    <text x={dn.position_x} y={dn.position_y + 28} textAnchor="middle"
                      fontSize="10" fill="#374151" fontWeight="500" className="pointer-events-none"
                      stroke="white" strokeWidth="2" paintOrder="stroke fill">
                      {dn.node_name}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom-Toolbar */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white/95 backdrop-blur border border-gray-200 rounded-lg shadow-lg p-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomOut} title="Verkleinern">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs font-mono w-12 text-center text-gray-600">{Math.round(transform.scale * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomIn} title="Vergrößern">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetView} title="Zurücksetzen">
          <Maximize2 className="w-4 h-4" />
        </Button>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />
        <Button
          variant={zoomLocked ? "secondary" : "ghost"}
          size="icon"
          className={`h-8 w-8 ${!zoomLocked ? 'text-orange-600' : ''}`}
          onClick={() => setZoomLocked(l => !l)}
          title={zoomLocked ? "Scroll-Zoom aktivieren" : "Scroll-Zoom sperren"}
        >
          {zoomLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </Button>
      </div>

      {/* Hinweis wenn Zoom gesperrt */}
      {zoomLocked && (
        <div className="absolute bottom-4 left-4 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded">
          Scrollen = Seite · Strg+Scroll oder 🔒 für Zoom
        </div>
      )}
    </div>
  );
}