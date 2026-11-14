
import { useState } from "react";
import { Paperclip, Smile, Send } from "lucide-react";

function MessageInput({ onSend }) {
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (!message.trim()) return;

    onSend(message);
    setMessage("");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="message-input-container">
      <div className="message-input">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Sentinel Bot"
          rows={1}
        />

        <div className="input-actions">
          <button title="Attach file"><Paperclip size={19} /></button>
          <button title="Emoji"><Smile size={19} /></button>
          <button
            className="send-button"
            onClick={handleSubmit}
            disabled={!message.trim()}
            title="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      <p className="input-hint">
        Press Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
}

export default MessageInput;
