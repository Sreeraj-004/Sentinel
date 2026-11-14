
import { Plus, Search, MoreHorizontal } from "lucide-react";

function ChatList() {
  return (
    <aside className="chat-list">
      <div className="chat-list-header">
        <div className="chat-title-row">
          <h2>Chat</h2>
          <button className="icon-button">
            <MoreHorizontal size={20} />
          </button>
        </div>

        <div className="chat-actions">
          <button className="new-chat-button">
            <Plus size={17} />
            New chat
          </button>
        </div>

        <div className="search-box">
          <Search size={17} />
          <input placeholder="Search" />
        </div>
      </div>

      <div className="chat-section-label">Recent</div>

      <div className="chat-list-items">
        <div className="chat-list-item selected">
          <div className="bot-avatar">S</div>

          <div className="chat-preview">
            <div className="chat-preview-top">
              <strong>Sentinel Bot</strong>
              <span>09:31 AM</span>
            </div>
            <p>I'm ready to check your infrastructure...</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default ChatList;
