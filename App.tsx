
import React from 'react';
// FIX: Updated react-router-dom imports for v5 compatibility.
import { HashRouter as Router, Switch, Route, Redirect } from 'react-router-dom';
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

function App() {
  return (
    <AlertProvider>
      <AuthProvider>
        <Router>
          <Layout>
            {/* FIX: Replaced Routes with Switch and updated Route syntax for v5 compatibility. */}
            <Switch>
              <Route path="/" exact component={Dashboard} />
              <Route path="/register" component={Register} />
              <Route path="/profile" component={Profile} />
              <Route path="/members" component={Members} />
              <Route path="/guild/:guildId" component={GuildDashboard} />
              <Route path="/admin" component={Admin} />
              <Route path="/events" component={Events} />
              <Route path="/alliances" component={Alliances} />
              <Route path="*">
                <Redirect to="/" />
              </Route>
            </Switch>
          </Layout>
        </Router>
      </AuthProvider>
    </AlertProvider>
  );
}

export default App;
