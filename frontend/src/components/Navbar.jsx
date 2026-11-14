import { ShieldCheck, LayoutDashboard, FileCode, Activity } from "lucide-react";

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
        <a className="active" href="/dashboard">
          <LayoutDashboard size={17} />
          Dashboard
        </a>

        <a href="/scripts">
          <FileCode size={17} />
          Scripts
        </a>

        <a href="/activity">
          <Activity size={17} />
          Activity
        </a>
      </div>

      <div className="nav-status">
        <span className="status-dot"></span>
        System Online
      </div>
    </nav>
  );
}

export default Navbar;