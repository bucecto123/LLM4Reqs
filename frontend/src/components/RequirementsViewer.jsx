import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/auth.js';

export default function RequirementsViewer({ projectId, onClose, refreshKey }) {
  const [requirements, setRequirements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ type: '', priority: '', search: '' });
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchRequirements();
    // eslint-disable-next-line
  }, [projectId, filters, page, refreshKey]);

  const fetchRequirements = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: filters.type,
        priority: filters.priority,
        search: filters.search,
        per_page: 10,
        page,
      });
      console.log('Fetching requirements with params:', {
        projectId,
        filters,
        page,
        params: params.toString()
      });
      
      const response = await apiFetch(`/api/projects/${projectId}/requirements?${params}`);
      console.log('Requirements API Response:', {
        success: response?.success,
        total: response?.total,
        dataLength: response?.data?.length,
        fullResponse: response
      });
      
      if (!response || response.success === false) {
        console.error('API Error Response:', response);
        throw new Error(response?.message || 'Failed to fetch requirements');
      }

      // Ensure we're always using the data array from the response
      const requirementsData = response.data || [];
      console.log('Requirements data:', requirementsData); // Debug log
      
      setRequirements(requirementsData);
      setTotalPages(response.last_page || 1);
    } catch (err) {
      console.error('Failed to load requirements:', err);
      setError(err.message || 'Failed to load requirements.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1);
  };

  return (
    <div className="fixed right-0 top-0 h-full w-1/2 bg-white shadow-xl z-40 flex flex-col border-l" style={{ minWidth: 400 }}>
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-xl font-bold" style={{ color: '#112D4E' }}>Requirements</h2>
        <button onClick={onClose} className="px-3 py-1 rounded hover:bg-gray-100">Close</button>
      </div>
      <div className="p-4 border-b flex space-x-4">
        <select name="type" value={filters.type} onChange={handleFilterChange} className="px-2 py-1 rounded border">
          <option value="">All Types</option>
          <option value="functional">Functional</option>
          <option value="non-functional">Non-Functional</option>
        </select>
        <select name="priority" value={filters.priority} onChange={handleFilterChange} className="px-2 py-1 rounded border">
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="Search text..."
          className="px-2 py-1 rounded border flex-1"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
        ) : error ? (
          <div className="p-4 text-red-600">{error}</div>
        ) : requirements.length === 0 ? (
          <div className="p-4 text-gray-500">No requirements found.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-2 text-left">ID</th>
                <th className="px-2 py-2 text-left">Type</th>
                <th className="px-2 py-2 text-left">Priority</th>
                <th className="px-2 py-2 text-left">Excerpt</th>
                <th className="px-2 py-2 text-left">Confidence</th>
                <th className="px-2 py-2 text-left">Source Doc</th>
                <th className="px-2 py-2 text-left">Extracted At</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map(req => (
                <tr key={req.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedRequirement(req)}>
                  <td className="px-2 py-2">{req.id}</td>
                  <td className="px-2 py-2">{req.requirement_type}</td>
                  <td className="px-2 py-2">{req.priority}</td>
                  <td className="px-2 py-2 truncate" title={req.requirement_text}>{req.requirement_text?.slice(0, 40) || ''}</td>
                  <td className="px-2 py-2">{req.confidence_score}</td>
                  <td className="px-2 py-2">{req.document?.title || req.document_id}</td>
                  <td className="px-2 py-2">{req.extracted_at ? new Date(req.extracted_at).toLocaleString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Pagination */}
      <div className="p-4 border-t flex items-center justify-between">
        <span>Page {page} of {totalPages}</span>
        <div className="space-x-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-2 py-1 rounded border">Prev</button>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-2 py-1 rounded border">Next</button>
        </div>
      </div>
      {/* Detail Panel */}
      {selectedRequirement && (
        <div className="fixed left-0 top-0 h-full w-1/2 bg-white shadow-2xl z-50 flex flex-col border-r" style={{ minWidth: 400 }}>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-bold" style={{ color: '#112D4E' }}>Requirement Detail</h3>
            <button onClick={() => setSelectedRequirement(null)} className="px-3 py-1 rounded hover:bg-gray-100">Close</button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="mb-4">
              <span className="font-semibold">ID:</span> {selectedRequirement.id}
            </div>
            <div className="mb-4">
              <span className="font-semibold">Type:</span> {selectedRequirement.requirement_type}
            </div>
            <div className="mb-4">
              <span className="font-semibold">Priority:</span> {selectedRequirement.priority}
            </div>
            <div className="mb-4">
              <span className="font-semibold">Confidence:</span> {selectedRequirement.confidence_score}
            </div>
            <div className="mb-4">
              <span className="font-semibold">Source Document:</span> {selectedRequirement.document?.title || selectedRequirement.document_id}
            </div>
            <div className="mb-4">
              <span className="font-semibold">Extracted At:</span> {selectedRequirement.extracted_at ? new Date(selectedRequirement.extracted_at).toLocaleString() : ''}
            </div>
            <div className="mb-4">
              <span className="font-semibold">Full Text:</span>
              <div className="mt-2 p-2 bg-gray-50 rounded border text-sm whitespace-pre-wrap">{selectedRequirement.requirement_text}</div>
            </div>
            {/* Metadata */}
            {selectedRequirement.document && (
              <div className="mb-4">
                <span className="font-semibold">Document Metadata:</span>
                <pre className="bg-gray-100 p-2 rounded text-xs mt-2">{JSON.stringify(selectedRequirement.document, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
