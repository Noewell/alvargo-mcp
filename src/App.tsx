import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AgentsMcp from './pages/AgentsMcp';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Root and /agents/mcp both serve the MCP landing page */}
        <Route path="/" element={<AgentsMcp />} />
        <Route path="/agents/mcp" element={<AgentsMcp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
