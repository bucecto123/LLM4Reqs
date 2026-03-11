import { useMemo } from "react";
import { BarChart2 } from "lucide-react";
import GraphRenderer from "./GraphRenderer";

const MERMAID_RE = /```mermaid\n([\s\S]*?)```/g;

function extractGraphs(messages) {
  const graphs = [];
  for (const msg of messages) {
    if (msg.role !== "assistant" || !msg.content) continue;
    MERMAID_RE.lastIndex = 0;
    let m;
    while ((m = MERMAID_RE.exec(msg.content)) !== null) {
      graphs.push({
        code: m[1].trim(),
        messageId: msg.id,
        createdAt: msg.created_at,
      });
    }
  }
  return graphs;
}

/**
 * GraphView
 *
 * Scans a list of messages for mermaid code blocks and renders each as a
 * GraphRenderer card.
 *
 * @param {Object}   props
 * @param {Array}    props.messages   - array of message objects with { role, content, id, created_at }
 * @param {boolean}  props.isLoading  - show loading spinner while messages are being fetched
 */
const GraphView = ({ messages = [], isLoading = false }) => {
  const graphs = useMemo(() => extractGraphs(messages), [messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-500">Loading graphs…</span>
      </div>
    );
  }

  if (graphs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
        <BarChart2 size={48} className="text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600">No graphs yet</h3>
        <p className="text-gray-400 text-sm mt-2 max-w-sm">
          Ask the AI to draw a diagram, flowchart, or sequence diagram and it
          will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto">
      {graphs.map((graph, idx) => (
        <div
          key={`${graph.messageId}-${idx}`}
          className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white"
        >
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
              Graph {idx + 1}
            </span>
            {graph.createdAt && (
              <span className="text-xs text-gray-400">
                {new Date(graph.createdAt).toLocaleString([], {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            )}
          </div>
          <GraphRenderer
            type="mermaid"
            mermaidCode={graph.code}
            height="400px"
            interactive={true}
          />
        </div>
      ))}
    </div>
  );
};

export default GraphView;
