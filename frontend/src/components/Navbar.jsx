
import {
  ShieldCheck,
  LayoutDashboard,
  FileCode,
  Activity,
} from "lucide-react";

import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <div className="brand-icon">
          <ShieldCheck size={23} />
        </div>

        <div>
          <h2>Sentinel</h2>
          <span>Infrastructure Intelligence</span>
        </div>
      </div>

      <div className="nav-links">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => isActive ? "active" : ""}
        >
          <LayoutDashboard size={17} />
          Dashboard
        </NavLink>

        <NavLink
          to="/scripts"
          className={({ isActive }) => isActive ? "active" : ""}
        >
          <FileCode size={17} />
          Scripts
        </NavLink>

        <NavLink
          to="/activity"
          className={({ isActive }) => isActive ? "active" : ""}
        >
          <Activity size={17} />
          Activity
        </NavLink>
      </div>

      <div className="nav-status">
        <span className="status-dot"></span>
        System Online
      </div>
    </nav>
  );
}

export default Navbar;
