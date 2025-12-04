
import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import Layout from './components/Layout';
import Register from './pages/Register';
import Members from './pages/Members';
import GuildDashboard from './pages/GuildDashboard';
import Admin from './pages/admin/Admin'; // Updated Import
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Profile from './pages/Profile';
import Arena from './pages/Arena';
import VsScreen from './pages/VsScreen';
import MatchBanner from './pages/MatchBanner';
import { AuthProvider } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';

const { HashRouter, Routes, Route, Navigate } = ReactRouterDOM as any;

function App() {
  return (
    <AlertProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            {/* Fullscreen Views */}
            <Route path="/vs-screen" element={<VsScreen />} />
            <Route path="/match-banner" element={<MatchBanner />} />
            
            <Route path="/*" element={
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/members" element={<Members />} />
                  <Route path="/guild/:guildId" element={<GuildDashboard />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/arena" element={<Arena />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            } />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </AlertProvider>
  );
}

export default App;
