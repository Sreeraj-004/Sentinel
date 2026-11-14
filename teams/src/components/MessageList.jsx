
import {
  CheckCircle2,
  XCircle,
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  AlertTriangle,
  LoaderCircle,
} from "lucide-react";

const resourceIcons = {
  CPU: Cpu,
  MEMORY: MemoryStick,
  DISK: HardDrive,
};

const statusLabels = {
  PENDING: "Awaiting approval",
  PROCESSING: "Processing decision",
  EXECUTING: "Executing use case",
  COMPLETED: "Action completed",
  FAILED: "Execution failed",
  REJECTED: "Request rejected",
  CLOSED: "Warning cleared",
};

function ActionRequestCard({
  request,
  onApprove,
  onReject,
}) {
  const ResourceIcon =
    resourceIcons[request.resource?.toUpperCase()] ||
    AlertTriangle;

  const isPending = request.status === "PENDING";
  const isExecuting =
    request.status === "EXECUTING" ||
    request.status === "PROCESSING";

  return (
    <div className="action-card">
      <div className="action-card-header">
        <div className="action-card-title">
          <AlertTriangle size={19} />
          <strong>Preventive action required</strong>
        </div>

        <span
          className={`request-status ${request.status.toLowerCase()}`}
        >
          {statusLabels[request.status] || request.status}
        </span>
      </div>

      <div className="action-server">
        <div className="action-server-icon">
          <Server size={21} />
        </div>

        <div>
          <span className="action-label">TARGET SERVER</span>
          <strong>{request.hostname}</strong>
        </div>
      </div>

      <div className="action-metrics">
        <div>
          <span className="action-label">RESOURCE</span>
          <div className="action-resource">
            <ResourceIcon size={17} />
            <strong>{request.resource}</strong>
          </div>
        </div>

        <div>
          <span className="action-label">UTILIZATION</span>
          <strong className="action-utilization">
            {request.observed_value}%
          </strong>
        </div>
      </div>

      <div className="action-description">
        <span className="action-label">DETECTED ISSUE</span>
        <p>{request.issue}</p>
      </div>

      <div className="action-description">
        <span className="action-label">RECOMMENDED ACTION</span>
        <strong>{request.action_title}</strong>
        <p>{request.action_details}</p>
      </div>

      {request.execution_result && (
        <div className="action-result">
          {request.execution_result}
        </div>
      )}

      {request.action_error && (
        <div className="action-error">
          {request.action_error}
        </div>
      )}

      {isPending ? (
        <div className="action-buttons">
          <button
            className="approve-button"
            onClick={() => onApprove(request)}
          >
            <CheckCircle2 size={17} />
            Approve & Execute
          </button>

          <button
            className="reject-button"
            onClick={() => onReject(request)}
          >
            <XCircle size={17} />
            Reject
          </button>
        </div>
      ) : (
        <div className="action-final-status">
          {isExecuting ? (
            <LoaderCircle className="spinning" size={17} />
          ) : request.status === "COMPLETED" ? (
            <CheckCircle2 size={17} />
          ) : request.status === "FAILED" ||
            request.status === "REJECTED" ? (
            <XCircle size={17} />
          ) : (
            <AlertTriangle size={17} />
          )}

          <span>
            {statusLabels[request.status] || request.status}
          </span>
        </div>
      )}
    </div>
  );
}

function MessageList({
  messages,
  onApprove,
  onReject,
}) {
  return (
    <section className="message-list">
      <div className="conversation-date">Today</div>

      {messages.map((message) => (
        <div
          key={message.id}
          className={`message-row ${
            message.isBot ? "bot-message" : "user-message"
          }`}
        >
          {message.isBot && (
            <div className="message-avatar">S</div>
          )}

          <div className="message-content">
            <div className="message-meta">
              <strong>{message.sender}</strong>
              <span>{message.time}</span>
            </div>

            {message.type === "action_request" ? (
              <ActionRequestCard
                request={message.request}
                onApprove={onApprove}
                onReject={onReject}
              />
            ) : (
              <div className="message-bubble">
                {message.text}
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

export default MessageList;
