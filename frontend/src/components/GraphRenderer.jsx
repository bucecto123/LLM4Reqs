import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Download, ZoomIn, ZoomOut, Maximize2, X, AlertTriangle } from 'lucide-react';

/**
 * Sanitize AI-generated Mermaid code to fix common parse errors.
 * Handles:
 *  - Labels containing > or < (wrap in quotes)
 *  - Bare ">" used as an arrow instead of "-->"
 *  - HTML entities that Mermaid can't parse
 */
function sanitizeMermaidCode(code) {
  if (!code) return code;

  // NOTE: Do NOT attempt to "fix" bare ">" into "-->" arrows here.
  // That heuristic is destructive — it converts valid syntax like "A --> B"
  // (where the ">" is the end of "-->", not a bare arrow) into "A -- -> B".
  // If the AI produces bad mermaid, let it fail loudly so the error display
  // shows the actual broken code rather than silently producing new errors.
  //
  // The only sanitization we apply is escaping < and > inside text labels
  // (inside [...] or (...)) so HTML-like text doesn't confuse the parser.
  const lines = code.split('\n');
  const sanitized = lines.map(line => {
    // Escape < and > inside node labels [...] so "<Customer>" etc. parse cleanly
    line = line.replace(/\[([^\]]+)\]/g, (match, inner) => {
      const sanitized = inner.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `[${sanitized}]`;
    });
    // Escape < and > inside edge labels (...)
    line = line.replace(/\(([^)]+)\)/g, (match, inner) => {
      const sanitized = inner.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `(${sanitized})`;
    });
    return line;
  });

  return sanitized.join('\n');
}

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
  },
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#fff',
    primaryBorderColor: '#2563eb',
    lineColor: '#6b7280',
    secondaryColor: '#10b981',
    tertiaryColor: '#f59e0b',
  }
});

/**
 * GraphRenderer Component
 *
 * Supports multiple graph formats:
 * 1. Mermaid syntax (flowchart, sequence, etc.)
 * 2. React Flow (nodes/edges format)
 * 3. Story Map format
 *
 * @param {Object} props
 * @param {string} props.type - 'mermaid' | 'flow' | 'storymap'
 * @param {string} props.mermaidCode - Mermaid diagram code
 * @param {Array} props.nodes - React Flow nodes
 * @param {Array} props.edges - React Flow edges
 * @param {Object} props.storyMap - Story map data structure
 * @param {boolean} props.interactive - Enable zoom/pan controls
 * @param {string} props.height - Container height (default: 600px)
 */
const GraphRenderer = ({
  type = 'mermaid',
  mermaidCode = '',
  nodes = [],
  edges = [],
  storyMap = null,
  interactive = true,
  height = '600px',
  className = ''
}) => {
  const mermaidRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mermaidSvg, setMermaidSvg] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.25));
  const handleResetZoom = () => setZoomLevel(1);

  // React Flow state
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([]);

  // Render Mermaid diagram
  useEffect(() => {
    if (type === 'mermaid' && mermaidCode && mermaidRef.current) {
      setLoading(true);
      setError(null);

      const renderMermaid = async () => {
        try {
          // Clear previous content
          mermaidRef.current.innerHTML = '';

          // Generate unique ID
          const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Sanitize and render diagram
          const cleanCode = sanitizeMermaidCode(mermaidCode);
          const { svg } = await mermaid.render(id, cleanCode);

          setMermaidSvg(svg);
          mermaidRef.current.innerHTML = svg;

          // Apply current zoom level immediately after render
          const renderedSvg = mermaidRef.current.querySelector('svg');
          if (renderedSvg) {
            renderedSvg.style.zoom = String(zoomLevel);
            renderedSvg.style.maxWidth = 'none';
            renderedSvg.style.display = 'block';
            renderedSvg.style.margin = 'auto';
          }

          setLoading(false);
        } catch (err) {
          console.error('Mermaid render error:', err);
          setError(`Failed to render diagram: ${err.message}`);
          setLoading(false);
        }
      };

      renderMermaid();
    }
  }, [type, mermaidCode]);

  // Apply zoom to inline diagram whenever zoomLevel changes
  useEffect(() => {
    const svg = mermaidRef.current?.querySelector('svg');
    if (svg) {
      svg.style.zoom = String(zoomLevel);
      svg.style.maxWidth = 'none';
      svg.style.display = 'block';
      svg.style.margin = 'auto';
    }
  }, [zoomLevel]);

  // Apply zoom to modal SVG (modal uses dangerouslySetInnerHTML so SVG is child of modalRef)
  const modalRef = useRef(null);
  useEffect(() => {
    if (!isModalOpen || !modalRef.current) return;
    const svg = modalRef.current.querySelector('svg');
    if (svg) {
      svg.style.zoom = String(zoomLevel);
      svg.style.maxWidth = 'none';
      svg.style.display = 'block';
      svg.style.margin = 'auto';
    }
  }, [zoomLevel, isModalOpen]);

  // Setup React Flow
  useEffect(() => {
    if (type === 'flow' && (nodes.length > 0 || edges.length > 0)) {
      setLoading(true);

      // Convert nodes to React Flow format
      const formattedNodes = nodes.map(node => ({
        id: node.id,
        type: node.type || 'default',
        data: {
          label: node.label || node.name || node.id,
          ...node
        },
        position: node.position || { x: Math.random() * 500, y: Math.random() * 500 },
        style: {
          background: getNodeColor(node.type || node.group),
          color: '#fff',
          border: '2px solid #2563eb',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '14px',
          fontWeight: '500',
        }
      }));

      // Convert edges to React Flow format
      const formattedEdges = edges.map((edge, idx) => ({
        id: edge.id || `edge-${idx}`,
        source: edge.source || edge.from,
        target: edge.target || edge.to,
        label: edge.label || edge.type,
        animated: edge.animated || false,
        type: edge.edgeType || 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        style: {
          stroke: edge.color || '#6b7280',
          strokeWidth: 2,
        }
      }));

      setFlowNodes(formattedNodes);
      setFlowEdges(formattedEdges);
      setLoading(false);
    }
  }, [type, nodes, edges, setFlowNodes, setFlowEdges]);

  // Convert Story Map to React Flow
  useEffect(() => {
    if (type === 'storymap' && storyMap) {
      setLoading(true);

      const convertedNodes = [];
      const convertedEdges = [];
      let yOffset = 0;
      let xOffset = 0;

      // Add meta/title node
      if (storyMap.meta) {
        convertedNodes.push({
          id: 'title',
          data: { label: storyMap.meta.title || 'Story Map' },
          position: { x: 400, y: yOffset },
          style: {
            background: '#ec4899',
            color: '#fff',
            border: '3px solid #db2777',
            borderRadius: '12px',
            padding: '15px',
            fontSize: '18px',
            fontWeight: 'bold',
          }
        });
        yOffset += 100;
      }

      // Add activities
      if (storyMap.activities) {
        storyMap.activities.forEach((activity, idx) => {
          const activityId = `activity-${activity.id}`;
          convertedNodes.push({
            id: activityId,
            data: { label: activity.name, ...activity },
            position: { x: xOffset + (idx * 300), y: yOffset },
            style: {
              background: '#3b82f6',
              color: '#fff',
              border: '2px solid #2563eb',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '14px',
              fontWeight: '600',
              minWidth: '200px',
            }
          });

          // Connect to title
          if (storyMap.meta) {
            convertedEdges.push({
              id: `title-${activityId}`,
              source: 'title',
              target: activityId,
              type: 'smoothstep',
              animated: true,
            });
          }
        });
        yOffset += 120;
      }

      // Add tasks
      if (storyMap.tasks) {
        storyMap.tasks.forEach((task, idx) => {
          const taskId = `task-${task.id}`;
          convertedNodes.push({
            id: taskId,
            data: { label: task.name, ...task },
            position: { x: 100 + (idx * 250), y: yOffset },
            style: {
              background: '#10b981',
              color: '#fff',
              border: '2px solid #059669',
              borderRadius: '6px',
              padding: '10px',
              fontSize: '13px',
              minWidth: '180px',
            }
          });

          // Connect tasks to activities if possible
          if (storyMap.userStories) {
            const story = storyMap.userStories.find(s => s.taskId === task.id);
            if (story && story.activityId) {
              convertedEdges.push({
                id: `activity-${story.activityId}-${taskId}`,
                source: `activity-${story.activityId}`,
                target: taskId,
                type: 'smoothstep',
              });
            }
          }
        });
        yOffset += 120;
      }

      // Add user stories
      if (storyMap.userStories) {
        storyMap.userStories.forEach((story, idx) => {
          const storyId = `story-${story.id}`;
          convertedNodes.push({
            id: storyId,
            data: { label: story.text || `Story ${story.id}`, ...story },
            position: { x: 50 + (idx * 200), y: yOffset },
            style: {
              background: story.priority === 'mvp' ? '#f59e0b' : '#8b5cf6',
              color: '#fff',
              border: '2px solid #7c3aed',
              borderRadius: '6px',
              padding: '8px',
              fontSize: '12px',
              maxWidth: '180px',
            }
          });

          // Connect to task
          if (story.taskId) {
            convertedEdges.push({
              id: `task-${story.taskId}-${storyId}`,
              source: `task-${story.taskId}`,
              target: storyId,
              type: 'smoothstep',
              label: story.priority,
              style: { stroke: story.priority === 'mvp' ? '#f59e0b' : '#8b5cf6' }
            });
          }
        });
      }

      setFlowNodes(convertedNodes);
      setFlowEdges(convertedEdges);
      setLoading(false);
    }
  }, [type, storyMap, setFlowNodes, setFlowEdges]);

  // Helper function to get node colors
  const getNodeColor = (type) => {
    const colors = {
      activity: '#3b82f6',
      task: '#10b981',
      story: '#8b5cf6',
      requirement: '#f59e0b',
      user: '#ec4899',
      feature: '#06b6d4',
      default: '#6b7280',
    };
    return colors[type] || colors.default;
  };

  // Export functions
  const exportAsSVG = () => {
    if (type === 'mermaid' && mermaidSvg) {
      const blob = new Blob([mermaidSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `graph-${Date.now()}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const exportAsPNG = () => {
    if (type === 'mermaid' && mermaidRef.current) {
      const svg = mermaidRef.current.querySelector('svg');
      if (!svg) return;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      const svgData = new XMLSerializer().serializeToString(svg);

      // Get SVG dimensions from viewBox or width/height attributes
      const getSvgDimensions = (svgString) => {
        let width = 800;
        let height = 600;

        // Try width/height attributes first
        const wMatch = svgString.match(/width=["'](\d+)/);
        const hMatch = svgString.match(/height=["'](\d+)/);
        if (wMatch) width = parseInt(wMatch[1]);
        if (hMatch) height = parseInt(hMatch[1]);

        // Fall back to viewBox
        const vbMatch = svgString.match(/viewBox=["']([\d\s.]+)["']/);
        if (vbMatch) {
          const parts = vbMatch[1].trim().split(/\s+/);
          if (parts.length === 4) {
            if (!wMatch) width = parseFloat(parts[2]);
            if (!hMatch) height = parseFloat(parts[3]);
          }
        }

        return { width, height };
      };

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const { width, height } = getSvgDimensions(svgData);
        const scale = 2;
        canvas.width = width * scale;
        canvas.height = height * scale;
        ctx.scale(scale, scale);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          const pngUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = pngUrl;
          a.download = `graph-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(pngUrl);
          URL.revokeObjectURL(url);
        });
      };

      img.src = url;
    }
  };

  // NOTE: We do NOT early-return a spinner here anymore.
  // Returning the spinner would unmount the mermaidRef div, making the ref null
  // and preventing the render effect from ever running (infinite loading deadlock).
  // Instead, we overlay the spinner on top of the mermaid container so the ref stays mounted.

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 ${className}`} style={{ height }}>
        <div className="w-full max-w-2xl p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">Diagram could not be rendered</span>
          </div>
          <pre className="text-xs text-gray-700 bg-white border rounded p-2 overflow-auto max-h-48 whitespace-pre-wrap font-mono">
            {mermaidCode}
          </pre>
          {interactive && (
            <p className="text-xs text-gray-400 mt-2">Check mermaid syntax</p>
          )}
        </div>
      </div>
    );
  }

  // Render Mermaid diagram
  if (type === 'mermaid') {
    return (
      <>
        {/* Fullscreen Modal */}
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white/10 border-b border-white/20">
              <span className="text-white font-semibold text-sm tracking-wide">Diagram — Fullscreen</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.25}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition disabled:opacity-40"
                  title="Zoom Out"
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition text-xs font-mono min-w-[3.5rem] text-center"
                  title="Reset zoom"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 4}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition disabled:opacity-40"
                  title="Zoom In"
                >
                  <ZoomIn size={18} />
                </button>
                <div className="w-px h-6 bg-white/20 mx-1" />
                <button
                  onClick={exportAsSVG}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
                  title="Export as SVG"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 bg-white/10 hover:bg-red-500/60 text-white rounded-lg transition ml-1"
                  title="Close fullscreen"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            {/* Modal diagram */}
            <div
              ref={modalRef}
              className="flex-1 overflow-auto p-8 flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: mermaidSvg }}
            />
          </div>
        )}

        {/* Normal card view */}
        <div className={`relative border border-gray-300 rounded-lg ${className}`} style={{ height }}>
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Rendering graph...</p>
              </div>
            </div>
          )}
          {interactive && (
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <button
                onClick={handleZoomOut}
                className="p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition"
                title="Zoom Out"
                disabled={zoomLevel <= 0.25}
              >
                <ZoomOut size={18} />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-2 py-1 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition text-xs font-mono text-gray-600 min-w-[3rem] text-center"
                title="Reset zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                className="p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition"
                title="Zoom In"
                disabled={zoomLevel >= 3}
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={exportAsSVG}
                className="p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition"
                title="Export as SVG"
              >
                <Download size={18} />
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition"
                title="Fullscreen"
              >
                <Maximize2 size={18} />
              </button>
            </div>
          )}
          <div
            ref={mermaidRef}
            className="w-full h-full overflow-auto p-8 bg-white flex items-center justify-center"
            style={{ minHeight: height }}
          />
        </div>
      </>
    );
  }

  // Render React Flow diagram
  if (type === 'flow' || type === 'storymap') {
    return (
      <div className={`border border-gray-300 rounded-lg overflow-hidden ${className}`} style={{ height }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={interactive ? onNodesChange : undefined}
          onEdgesChange={interactive ? onEdgesChange : undefined}
          fitView
          attributionPosition="bottom-left"
        >
          {interactive && (
            <>
              <Controls />
              <MiniMap
                nodeColor={(node) => node.style?.background || '#6b7280'}
                maskColor="rgba(0, 0, 0, 0.1)"
              />
              <Background variant="dots" gap={12} size={1} />
            </>
          )}
          <Panel position="top-right" className="bg-white/90 backdrop-blur p-2 rounded-lg shadow-sm">
            <div className="text-xs text-gray-600">
              {flowNodes.length} nodes • {flowEdges.length} edges
            </div>
          </Panel>
        </ReactFlow>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`} style={{ height }}>
      <p className="text-gray-500">No graph data provided</p>
    </div>
  );
};

export default GraphRenderer;
