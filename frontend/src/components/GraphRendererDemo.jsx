import { useState } from 'react';
import GraphRenderer from './GraphRenderer';

/**
 * Demo component to showcase different graph rendering capabilities
 */
const GraphRendererDemo = () => {
  const [selectedType, setSelectedType] = useState('mermaid');

  // Sample Mermaid diagrams
  const mermaidExamples = {
    flowchart: `graph TD
    A[User Login] -->|Authentication| B{Valid Credentials?}
    B -->|Yes| C[Dashboard]
    B -->|No| D[Error Message]
    C --> E[View Projects]
    C --> F[Create Project]
    E --> G[Select Project]
    F --> H[Add Requirements]
    G --> H
    H --> I[Generate Analysis]
    I --> J[View Conflicts]
    I --> K[Generate Story Map]
    K --> L[Export Graph]
    
    style A fill:#3b82f6,stroke:#2563eb,color:#fff
    style C fill:#10b981,stroke:#059669,color:#fff
    style I fill:#f59e0b,stroke:#d97706,color:#fff
    style K fill:#8b5cf6,stroke:#7c3aed,color:#fff`,
    
    sequence: `sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant L as LLM Service
    
    U->>F: Upload Requirements
    F->>B: POST /api/requirements
    B->>L: Analyze Requirements
    L-->>B: Return Analysis
    B->>L: Generate Story Graph
    L-->>B: Return Graph Data
    B-->>F: Send Results
    F-->>U: Display Graph`,

    userStoryMap: `graph TD
    Title["E-Commerce Platform"]
    
    Title --> A1[User Management]
    Title --> A2[Product Catalog]
    Title --> A3[Shopping Cart]
    Title --> A4[Checkout]
    
    A1 --> T1[User Registration]
    A1 --> T2[User Login]
    A1 --> T3[Profile Management]
    
    A2 --> T4[Browse Products]
    A2 --> T5[Search Products]
    A2 --> T6[Filter & Sort]
    
    A3 --> T7[Add to Cart]
    A3 --> T8[Update Quantity]
    A3 --> T9[Remove Items]
    
    A4 --> T10[Payment Processing]
    A4 --> T11[Order Confirmation]
    
    T1 --> S1["MVP: Sign up with email"]
    T1 --> S2["As a user, I can register with social login"]
    T2 --> S3["MVP: Login with credentials"]
    T4 --> S4["MVP: View product list with images"]
    T4 --> S5["As a user, I can see product details"]
    T7 --> S6["MVP: Add product to cart"]
    T10 --> S7["MVP: Pay with credit card"]
    
    style Title fill:#ec4899,stroke:#db2777,color:#fff
    style A1 fill:#3b82f6,stroke:#2563eb,color:#fff
    style A2 fill:#3b82f6,stroke:#2563eb,color:#fff
    style A3 fill:#3b82f6,stroke:#2563eb,color:#fff
    style A4 fill:#3b82f6,stroke:#2563eb,color:#fff
    style T1 fill:#10b981,stroke:#059669,color:#fff
    style T2 fill:#10b981,stroke:#059669,color:#fff
    style T3 fill:#10b981,stroke:#059669,color:#fff
    style T4 fill:#10b981,stroke:#059669,color:#fff
    style T5 fill:#10b981,stroke:#059669,color:#fff
    style T6 fill:#10b981,stroke:#059669,color:#fff
    style T7 fill:#10b981,stroke:#059669,color:#fff
    style T8 fill:#10b981,stroke:#059669,color:#fff
    style T9 fill:#10b981,stroke:#059669,color:#fff
    style T10 fill:#10b981,stroke:#059669,color:#fff
    style T11 fill:#10b981,stroke:#059669,color:#fff
    style S1 fill:#f59e0b,stroke:#d97706,color:#fff
    style S3 fill:#f59e0b,stroke:#d97706,color:#fff
    style S4 fill:#f59e0b,stroke:#d97706,color:#fff
    style S6 fill:#f59e0b,stroke:#d97706,color:#fff
    style S7 fill:#f59e0b,stroke:#d97706,color:#fff
    style S2 fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style S5 fill:#8b5cf6,stroke:#7c3aed,color:#fff`
  };

  // Sample React Flow data
  const flowData = {
    nodes: [
      { id: '1', label: 'Start', type: 'user', position: { x: 250, y: 0 } },
      { id: '2', label: 'Authentication', type: 'feature', position: { x: 100, y: 100 } },
      { id: '3', label: 'Dashboard', type: 'feature', position: { x: 400, y: 100 } },
      { id: '4', label: 'User Profile', type: 'story', position: { x: 100, y: 200 } },
      { id: '5', label: 'Project List', type: 'story', position: { x: 400, y: 200 } },
      { id: '6', label: 'Requirements', type: 'task', position: { x: 250, y: 300 } },
    ],
    edges: [
      { source: '1', target: '2', label: 'login', animated: true },
      { source: '1', target: '3', label: 'access' },
      { source: '2', target: '4', label: 'manages' },
      { source: '3', target: '5', label: 'displays' },
      { source: '4', target: '6', label: 'creates' },
      { source: '5', target: '6', label: 'contains' },
    ]
  };

  // Sample Story Map data
  const storyMapData = {
    meta: {
      title: "Mobile Banking App",
      goal: "Provide seamless banking experience",
      product: "Banking Mobile App"
    },
    activities: [
      { id: "A1", name: "Account Management", order: 1 },
      { id: "A2", name: "Transactions", order: 2 },
      { id: "A3", name: "Reports", order: 3 }
    ],
    tasks: [
      { id: "T1", name: "Login", order: 1, priority: "must" },
      { id: "T2", name: "View Balance", order: 2, priority: "must" },
      { id: "T3", name: "Transfer Money", order: 3, priority: "must" },
      { id: "T4", name: "Transaction History", order: 4, priority: "should" },
      { id: "T5", name: "Generate Statement", order: 5, priority: "could" }
    ],
    userStories: [
      { 
        id: "S1", 
        activityId: "A1", 
        taskId: "T1", 
        text: "As a user, I can login with biometric", 
        priority: "mvp" 
      },
      { 
        id: "S2", 
        activityId: "A1", 
        taskId: "T2", 
        text: "As a user, I can view my account balance", 
        priority: "mvp" 
      },
      { 
        id: "S3", 
        activityId: "A2", 
        taskId: "T3", 
        text: "As a user, I can transfer to saved contacts", 
        priority: "mvp" 
      },
      { 
        id: "S4", 
        activityId: "A2", 
        taskId: "T3", 
        text: "As a user, I can transfer to new recipients", 
        priority: "next" 
      },
      { 
        id: "S5", 
        activityId: "A2", 
        taskId: "T4", 
        text: "As a user, I can filter transactions by date", 
        priority: "next" 
      },
      { 
        id: "S6", 
        activityId: "A3", 
        taskId: "T5", 
        text: "As a user, I can download PDF statements", 
        priority: "later" 
      }
    ]
  };

  const renderDemo = () => {
    switch(selectedType) {
      case 'mermaid-flowchart':
        return (
          <GraphRenderer 
            type="mermaid"
            mermaidCode={mermaidExamples.flowchart}
            interactive={true}
            height="700px"
          />
        );
      
      case 'mermaid-sequence':
        return (
          <GraphRenderer 
            type="mermaid"
            mermaidCode={mermaidExamples.sequence}
            interactive={true}
            height="600px"
          />
        );
      
      case 'mermaid-storymap':
        return (
          <GraphRenderer 
            type="mermaid"
            mermaidCode={mermaidExamples.userStoryMap}
            interactive={true}
            height="800px"
          />
        );
      
      case 'flow':
        return (
          <GraphRenderer 
            type="flow"
            nodes={flowData.nodes}
            edges={flowData.edges}
            interactive={true}
            height="600px"
          />
        );
      
      case 'storymap':
        return (
          <GraphRenderer 
            type="storymap"
            storyMap={storyMapData}
            interactive={true}
            height="700px"
          />
        );
      
      default:
        return <p className="text-gray-500">Select a graph type to view demo</p>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Graph Renderer Demo
        </h1>
        <p className="text-gray-600">
          Showcase of different graph rendering capabilities with visual diagrams
        </p>
      </div>

      {/* Graph Type Selector */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedType('mermaid-flowchart')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedType === 'mermaid-flowchart'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📊 Flowchart (Mermaid)
        </button>
        
        <button
          onClick={() => setSelectedType('mermaid-sequence')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedType === 'mermaid-sequence'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🔄 Sequence Diagram
        </button>
        
        <button
          onClick={() => setSelectedType('mermaid-storymap')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedType === 'mermaid-storymap'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📖 Story Map (Mermaid)
        </button>
        
        <button
          onClick={() => setSelectedType('flow')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedType === 'flow'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🌊 Interactive Flow
        </button>
        
        <button
          onClick={() => setSelectedType('storymap')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedType === 'storymap'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🗺️ Story Map (Flow)
        </button>
      </div>

      {/* Info Panel */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Current Graph Type:</h3>
        <div className="text-sm text-blue-800">
          {selectedType === 'mermaid-flowchart' && (
            <>
              <strong>Mermaid Flowchart</strong> - Best for visualizing workflows, decision trees, and process flows. 
              Supports export to SVG/PNG.
            </>
          )}
          {selectedType === 'mermaid-sequence' && (
            <>
              <strong>Sequence Diagram</strong> - Perfect for showing interactions between system components over time.
            </>
          )}
          {selectedType === 'mermaid-storymap' && (
            <>
              <strong>Story Map (Mermaid)</strong> - Hierarchical view of user stories organized by activities and tasks.
            </>
          )}
          {selectedType === 'flow' && (
            <>
              <strong>Interactive Flow</strong> - Fully interactive graph with zoom, pan, and node dragging. 
              Great for complex relationships.
            </>
          )}
          {selectedType === 'storymap' && (
            <>
              <strong>Story Map (Flow)</strong> - Interactive story map with Activities → Tasks → User Stories hierarchy.
              Supports drag-and-drop and filtering.
            </>
          )}
        </div>
      </div>

      {/* Graph Renderer */}
      <div className="bg-white rounded-lg shadow-lg">
        {renderDemo()}
      </div>

      {/* Usage Instructions */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">How to Use:</h3>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li><strong>Mermaid graphs</strong>: Click Export buttons to save as SVG or PNG</li>
          <li><strong>Flow graphs</strong>: Use mouse wheel to zoom, drag to pan, drag nodes to rearrange</li>
          <li><strong>Controls</strong>: Use the control panel (bottom-left) for zoom and fit view</li>
          <li><strong>MiniMap</strong>: Use the minimap (bottom-right) for navigation in large graphs</li>
        </ul>
      </div>

      {/* Code Example */}
      <div className="mt-6 p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto">
        <h3 className="font-semibold mb-2 text-white">Usage Example:</h3>
        <pre className="text-xs">
{`// Mermaid Flowchart
<GraphRenderer 
  type="mermaid"
  mermaidCode={\`graph TD
    A[Start] --> B[Process]
    B --> C[End]\`}
  interactive={true}
/>

// React Flow
<GraphRenderer 
  type="flow"
  nodes={[
    { id: '1', label: 'Node 1', position: { x: 0, y: 0 } }
  ]}
  edges={[
    { source: '1', target: '2' }
  ]}
/>

// Story Map
<GraphRenderer 
  type="storymap"
  storyMap={{
    meta: { title: "My App" },
    activities: [...],
    tasks: [...],
    userStories: [...]
  }}
/>`}
        </pre>
      </div>
    </div>
  );
};

export default GraphRendererDemo;
