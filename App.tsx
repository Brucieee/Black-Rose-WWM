
import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
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

// Destructure components safely from the namespace import to handle potential v5/v6 mismatches
const Router = ReactRouterDOM.HashRouter;
const Routes = (ReactRouterDOM as any).Routes || (ReactRouterDOM as any).Switch;
const Route = ReactRouterDOM.Route;
const Navigate = (ReactRouterDOM as any).Navigate || (ReactRouterDOM as any).Redirect;

function App() {
  return (
    <AlertProvider>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />}>
                {/* Fallback for v5 Route syntax which uses children/render instead of element prop */}
                {!React.isValidElement(<Dashboard />) && <Dashboard />}
              </Route>
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
