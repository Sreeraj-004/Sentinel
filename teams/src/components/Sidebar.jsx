
import {
  Activity,
  Bell,
  CalendarDays,
  MessageSquare,
  Phone,
  Settings,
  Users,
} from "lucide-react";

const navigation = [
  { label: "Activity", icon: Activity },
  { label: "Chat", icon: MessageSquare, active: true },
  { label: "Teams", icon: Users },
  { label: "Calls", icon: Phone },
  { label: "Calendar", icon: CalendarDays },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">T</div>

      <div className="sidebar-nav">
        {navigation.map(({ label, icon: Icon, active }) => (
          <button
            className={`nav-item ${active ? "active" : ""}`}
            key={label}
            title={label}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-bottom">
        <button className="nav-item" title="Notifications">
          <Bell size={21} />
          <span>Notifications</span>
        </button>
        <button className="nav-item" title="Settings">
          <Settings size={21} />
          <span>Settings</span>
        </button>
        <div className="user-avatar">SP</div>
      </div>
    </aside>
  );
}

export default Sidebar;
