import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Register from './pages/Register';
import Members from './pages/Members';
import GuildDashboard from './pages/GuildDashboard';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/register" element={<Register />} />
            <Route path="/members" element={<Members />} />
            <Route path="/guild/:guildId" element={<GuildDashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/events" element={<Events />} />
            <Route path="/alliances" element={<div className="p-8">Alliances Page Placeholder</div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;