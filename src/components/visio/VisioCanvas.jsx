import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function VisioCanvas({ nodes, connections, onNodeClick, onConnectionClick, showOnlyLight, onNodeMove, highlightedNodes = [], highlightedConnections = [] }) {
  const svgRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState(null);
  const [nodeDragStart, setNodeDragStart] = useState({ x: 0, y: 0 });

  // Automatisches Lichtpfad-Tracking: Alle Verbindungen bis zum HVT markieren
  const getLightPathConnections = () => {
    const lightNVTs = nodes.filter(n => n.node_type === 'NVT' && n.status === 'LICHT');
    const lightPaths = new Set();

    lightNVTs.forEach(nvt => {
      const visited = new Set();
      const findPathToHVT = (currentNodeId) => {
        if (visited.has(currentNodeId)) return;
        visited.add(currentNodeId);

        const currentNode = nodes.find(n => n.id === currentNodeId);
        if (!currentNode) return;
        if (currentNode.node_type === 'HVT') return;

        const incomingConnections = connections.filter(c => c.to_node_id === currentNodeId);
        incomingConnections.forEach(conn => {
          lightPaths.add(conn.id);
          findPathToHVT(conn.from_node_id);
        });
      };

      findPathToHVT(nvt.id);
    });

    return lightPaths;
  };

  const lightPathConnections = getLightPathConnections();

  // Zoom & Pan Funktionen
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(0.3, transform.scale + delta), 3);
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e) => {
    if (e.target.tagName === 'svg' || e.target.tagName === 'rect' && e.target.id === 'background') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e) => {
    if (draggingNode) {
      const svg = svgRef.current;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      
      // Transformiere Bildschirmkoordinaten zu SVG-Koordinaten
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
      
      setDraggingNode(prev => ({
        ...prev,
        position_x: svgP.x,
        position_y: svgP.y
      }));
    } else if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  };

  const handleMouseUp = () => {
    if (draggingNode && onNodeMove) {
      onNodeMove(draggingNode.id, draggingNode.position_x, draggingNode.position_y);
    }
    setIsDragging(false);
    setDraggingNode(null);
  };

  const handleNodeMouseDown = (e, node) => {
    e.stopPropagation();
    setDraggingNode(node);
    setNodeDragStart({ x: node.position_x, y: node.position_y });
  };

  useEffect(() => {
    if (isDragging || draggingNode) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, draggingNode, dragStart, transform]);

  // Filtere Verbindungen
  const visibleConnections = showOnlyLight 
    ? connections.filter(c => lightPathConnections.has(c.id))
    : connections;

  const getConnectionColor = (connection) => {
    if (highlightedConnections.length > 0 && highlightedConnections.includes(connection.id)) {
      return '#f59e0b'; // Orange für hervorgehobene Verbindungen
    }
    if (connection.status === 'UNTER_LICHT') return '#10b981'; // Stark grün
    return '#ef4444'; // Rot für KEINE_VERBINDUNG
  };

  const getConnectionStyle = (connection) => {
    const isHighlighted = highlightedConnections.length > 0 && highlightedConnections.includes(connection.id);
    
    const style = {
      stroke: getConnectionColor(connection),
      strokeWidth: isHighlighted ? 4 : (connection.status === 'UNTER_LICHT' ? 3 : 2),
      fill: 'none'
    };

    if (isHighlighted) {
      style.filter = 'drop-shadow(0 0 6px #f59e0b)';
    } else if (connection.status === 'UNTER_LICHT') {
      style.filter = 'drop-shadow(0 0 4px #10b981)';
    }

    return style;
  };

  const getNodeColor = (node) => {
    if (highlightedNodes.length > 0 && highlightedNodes.includes(node.id)) {
      return '#f59e0b'; // Orange für hervorgehobene Knoten
    }
    if (node.status === 'LICHT') return '#10b981';
    if (node.status === 'STÖRUNG') return '#ef4444';
    return '#3b82f6';
  };

  return (
    <div 
      className="relative w-full h-[600px] bg-gray-50 rounded-lg border overflow-hidden cursor-move"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox="0 0 1200 800"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transition: isDragging ? 'none' : 'transform 0.1s'
        }}
      >
        <rect id="background" width="1200" height="800" fill="transparent" />

        {/* Verbindungen zeichnen */}
        <g className="connections">
          {visibleConnections.map(conn => {
            const fromNode = nodes.find(n => n.id === conn.from_node_id);
            const toNode = nodes.find(n => n.id === conn.to_node_id);
            if (!fromNode || !toNode) return null;

            const isUnterLicht = conn.status === 'UNTER_LICHT';

            // Berechne Mittelpunkt für Label
            const midX = (fromNode.position_x + toNode.position_x) / 2;
            const midY = (fromNode.position_y + toNode.position_y) / 2;
            
            return (
              <g key={conn.id}>
                <line
                  x1={fromNode.position_x}
                  y1={fromNode.position_y}
                  x2={toNode.position_x}
                  y2={toNode.position_y}
                  {...getConnectionStyle(conn)}
                  className={`cursor-pointer transition-all hover:stroke-[4] ${
                    isUnterLicht ? 'animate-pulse' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onConnectionClick(conn);
                  }}
                />
                {/* Label mit Kabeltyp und Länge */}
                <text
                  x={midX}
                  y={midY - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#374151"
                  fontWeight="600"
                  className="pointer-events-none"
                  style={{ 
                    textShadow: '0 0 3px white, 0 0 3px white, 0 0 3px white',
                    paintOrder: 'stroke fill'
                  }}
                >
                  {conn.cable_type}
                </text>
                {conn.length_meters > 0 && (
                  <text
                    x={midX}
                    y={midY + 8}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#6b7280"
                    fontWeight="500"
                    className="pointer-events-none"
                    style={{ 
                      textShadow: '0 0 3px white, 0 0 3px white, 0 0 3px white',
                      paintOrder: 'stroke fill'
                    }}
                  >
                    {conn.length_meters}m
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Knoten zeichnen */}
        <g className="nodes">
          {nodes.map(node => {
            const displayNode = draggingNode && draggingNode.id === node.id ? draggingNode : node;
            const color = getNodeColor(displayNode);
            const isHighlighted = highlightedNodes.length > 0 && highlightedNodes.includes(node.id);
            
            return (
              <g
                key={node.id}
                className={`cursor-move hover:opacity-80 transition-opacity ${isHighlighted ? 'animate-pulse' : ''}`}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!draggingNode) onNodeClick(node);
                }}
                style={isHighlighted ? { filter: 'drop-shadow(0 0 8px #f59e0b)' } : {}}
              >
                {displayNode.node_type === 'HVT' && (
                  <>
                    <rect
                      x={displayNode.position_x - 40}
                      y={displayNode.position_y - 30}
                      width="80"
                      height="60"
                      fill={color}
                      stroke={isHighlighted ? "#f59e0b" : "#1f2937"}
                      strokeWidth={isHighlighted ? "3" : "2"}
                      rx="4"
                    />
                    <text
                      x={displayNode.position_x}
                      y={displayNode.position_y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="12"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {displayNode.node_name}
                    </text>
                  </>
                )}
                
                {displayNode.node_type === 'MUFFE' && (
                  <>
                    <circle
                      cx={displayNode.position_x}
                      cy={displayNode.position_y}
                      r="20"
                      fill={color}
                      stroke={isHighlighted ? "#f59e0b" : "#1f2937"}
                      strokeWidth={isHighlighted ? "3" : "2"}
                    />
                    <text
                      x={displayNode.position_x}
                      y={displayNode.position_y + 35}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#374151"
                      fontWeight="500"
                      className="pointer-events-none"
                    >
                      {displayNode.node_name}
                    </text>
                  </>
                )}
                
                {displayNode.node_type === 'NVT' && (
                  <>
                    <rect
                      x={displayNode.position_x - 15}
                      y={displayNode.position_y - 15}
                      width="30"
                      height="30"
                      fill={color}
                      stroke={isHighlighted ? "#f59e0b" : "#1f2937"}
                      strokeWidth={isHighlighted ? "3" : "2"}
                      rx="2"
                      className={displayNode.status === 'LICHT' ? 'animate-pulse' : ''}
                    />
                    <text
                      x={displayNode.position_x}
                      y={displayNode.position_y + 25}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#374151"
                      fontWeight="500"
                      className="pointer-events-none"
                    >
                      {displayNode.node_name}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom-Info */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-lg text-xs">
        Zoom: {Math.round(transform.scale * 100)}%
      </div>
    </div>
  );
}