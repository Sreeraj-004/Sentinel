
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Activity from "./pages/Activity";
import Scripts from "./pages/Scripts";
import ServerDetails from "./pages/ServerDetails";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />

        <Routes>
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/activity"
            element={<Activity />}
          />

          <Route
            path="/scripts"
            element={<Scripts />}
          />

          <Route
            path="/servers/:serverId"
            element={<ServerDetails />}
          />

          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
