
import {
  Phone,
  Video,
  Search,
  MoreHorizontal,
  Users,
} from "lucide-react";

function ChatHeader() {
  return (
    <header className="chat-header">
      <div className="chat-header-info">
        <div className="bot-avatar">S</div>

        <div>
          <h3>Sentinel Bot</h3>
          <span className="bot-status">
            <span className="status-dot"></span>
            Available
          </span>
        </div>
      </div>

      <div className="chat-header-actions">
        <button title="Audio call"><Phone size={19} /></button>
        <button title="Video call"><Video size={19} /></button>
        <button title="Participants"><Users size={19} /></button>
        <button title="Search"><Search size={19} /></button>
        <button title="More options"><MoreHorizontal size={19} /></button>
      </div>
    </header>
  );
}

export default ChatHeader;
