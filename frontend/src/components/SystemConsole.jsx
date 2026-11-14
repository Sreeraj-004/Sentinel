
import {
  Activity,
  Terminal,
  CircleCheck,
  AlertTriangle,
  Info,
  ShieldAlert,
  LoaderCircle,
} from "lucide-react";

import { useEffect, useRef } from "react";

function getLogIcon(level) {
  switch (level) {
    case "SUCCESS":
      return <CircleCheck size={15} />;

    case "WARNING":
      return <AlertTriangle size={15} />;

    case "ALERT":
    case "CRITICAL":
      return <ShieldAlert size={15} />;

    default:
      return <Info size={15} />;
  }
}

function SystemConsole({
  logs = [],
  title = "Sentinel System Console",
  subtitle = "EVENT LOGS",
  live = false,
  maxHeight = 560,
}) {
  const consoleBodyRef = useRef(null);

  useEffect(() => {
    const consoleElement = consoleBodyRef.current;

    if (!consoleElement) return;

    consoleElement.scrollTop = consoleElement.scrollHeight;
  }, [logs.length]);

  return (
    <section className="activity-console">
      <div className="console-header">
        <div className="console-title">
          <Terminal size={17} />
          <span>{title}</span>
        </div>

        <div className="console-controls">
          <span className="console-dot red" />
          <span className="console-dot yellow" />
          <span className="console-dot green" />
        </div>
      </div>

      <div className="console-toolbar">
        <span>
          <Activity size={14} />
          {subtitle}
        </span>

        <span>{logs.length} EVENTS</span>
      </div>

      <div
        ref={consoleBodyRef}
        className="console-body"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {logs.length > 0 ? (
          logs.map((log) => (
            <div className="log-entry" key={log.id}>
              <span className="log-time">{log.time}</span>

              <span className={`log-level ${log.level.toLowerCase()}`}>
                {getLogIcon(log.level)}
                {log.level}
              </span>

              <span className="log-source">{log.source}</span>

              <span className="log-message">{log.message}</span>
            </div>
          ))
        ) : (
          <div className="empty-state">
            No activity recorded yet.
          </div>
        )}
      </div>

      <div className="console-footer">
        <span className="console-prompt">
          sentinel@system:~$
        </span>

        <span className="console-cursor" />

        <span className="console-footer-text">
          {live ? (
            <>
              <LoaderCircle
                size={13}
                className="console-live-icon"
              />
              Monitoring for new events...
            </>
          ) : (
            "Console ready."
          )}
        </span>
      </div>
    </section>
  );
}

export default SystemConsole;
