import React from 'react';
// FIX: Using named imports for react-router-dom v6 and aliasing HashRouter to Router.
// FIX: Switched to a namespace import to resolve potential module resolution issues with named exports.
import * as ReactRouterDOM from 'react-router-dom';
const Router = ReactRouterDOM.HashRouter;
const Routes = ReactRouterDOM.Routes;
const Route = ReactRouterDOM.Route;
const Navigate = ReactRouterDOM.Navigate;
import Layout from './components/Layout';
import Register from './pages/Register';
import Members from './pages/Members';
import GuildDashboard from './pages/GuildDashboard';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Profile from './pages/Profile';
import Alliances from './pages/Alliances';
import { AuthProvider } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';

// FIX: Removing compatibility code for react-router-dom v5/v6. Standardizing on v6.

function App() {
  return (
    <AlertProvider>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              {/* FIX: Using self-closing Route component with 'element' prop, standard for v6. */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/members" element={<Members />} />
              <Route path="/guild/:guildId" element={<GuildDashboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/events" element={<Events />} />
              <Route path="/alliances" element={<Alliances />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </AlertProvider>
  );
}

export default App;