
import { useCallback, useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatList from "./components/ChatList";
import ChatHeader from "./components/ChatHeader";
import MessageList from "./components/MessageList";
import MessageInput from "./components/MessageInput";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:8000/api";
const POLL_INTERVAL = 2000;

const getMessageTime = (dateValue) => {
  if (!dateValue) return "";

  return new Date(dateValue).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

function App() {
  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      sender: "Sentinel Bot",
      text: "Hello! I'm Sentinel Bot. I can help you monitor infrastructure health, investigate alerts, and manage preventive actions.",
      time: "09:30 AM",
      isBot: true,
    },
  ]);

  const [connectionError, setConnectionError] = useState("");

  const getMessageTime = (dateValue) => {
    if (!dateValue) return "";

    return new Date(dateValue).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchActionRequests = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/action-requests`
      );

      if (!response.ok) {
        throw new Error("Unable to retrieve action requests.");
      }

      const requests = await response.json();

      setMessages((previousMessages) => {
        const messageMap = new Map(
          previousMessages.map((message) => [
            message.id,
            message,
          ])
        );

        requests.forEach((request) => {
          const messageId = `action-${request.id}`;

          messageMap.set(messageId, {
            id: messageId,
            sender: "Sentinel Bot",
            time: getMessageTime(request.created_at),
            isBot: true,
            type: "action_request",
            request: request,
          });
        });

        return Array.from(messageMap.values());
      });

      setConnectionError("");
    } catch (error) {
      setConnectionError(error.message);
    }
  }, []);

  useEffect(() => {
    fetchActionRequests();

    const intervalId = setInterval(
      fetchActionRequests,
      POLL_INTERVAL
    );

    return () => clearInterval(intervalId);
  }, [fetchActionRequests]);

  const sendMessage = (text) => {
    if (!text.trim()) return;

    const newMessage = {
      id: `user-${Date.now()}`,
      sender: "You",
      text: text.trim(),
      time: getMessageTime(new Date()),
      isBot: false,
    };

    setMessages((previous) => [
      ...previous,
      newMessage,
    ]);
  };

  const updateActionRequest = (requestId, updates) => {
    setMessages((previousMessages) =>
      previousMessages.map((message) => {
        if (
          message.type !== "action_request" ||
          message.request.id !== requestId
        ) {
          return message;
        }

        return {
          ...message,
          request: {
            ...message.request,
            ...updates,
          },
        };
      })
    );
  };

  const approveAction = async (request) => {
    if (request.status !== "PENDING") return;

    updateActionRequest(request.id, {
      status: "EXECUTING",
      action_error: null,
    });

    try {
      const response = await fetch(
        `${API_BASE_URL}/use-cases/execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            server_id: request.server_id,
            use_case: request.resource,
            action_request_id: request.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || "Action execution failed."
        );
      }

      updateActionRequest(request.id, {
        status: result.success ? "COMPLETED" : "FAILED",
        execution_result: result.message,
        action_error: null,
      });

      await fetchActionRequests();
    } catch (error) {
      updateActionRequest(request.id, {
        action_error: error.message,
      });
    }
  };

  const rejectAction = async (request) => {
    if (request.status !== "PENDING") return;

    updateActionRequest(request.id, {
      status: "PROCESSING",
      action_error: null,
    });

    try {
      const response = await fetch(
        `${API_BASE_URL}/action-requests/${request.id}/reject`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || "Unable to reject action request."
        );
      }

      updateActionRequest(request.id, {
        status: "REJECTED",
        action_error: null,
      });

      await fetchActionRequests();
    } catch (error) {
      updateActionRequest(request.id, {
        status: "PENDING",
        action_error: error.message,
      });
    }
  };

  return (
    <div className="teams-app">
      <Sidebar />

      <ChatList />

      <main className="chat-panel">
        <ChatHeader />

        {connectionError && (
          <div className="connection-error">
            Backend connection issue: {connectionError}
          </div>
        )}

        <MessageList
          messages={messages}
          onApprove={approveAction}
          onReject={rejectAction}
        />

        <MessageInput onSend={sendMessage} />
      </main>
    </div>
  );
}

export default App;
