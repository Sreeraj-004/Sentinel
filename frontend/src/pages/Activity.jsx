
import { useCallback, useEffect, useState } from "react";

import ServerStats from "../components/ServerStats";
import SystemConsole from "../components/SystemConsole";
import { fetchServers } from "../services/serverService";

const API_URL = "http://127.0.0.1:8000/api/servers";
const LOG_POLL_INTERVAL = 500;

function Activity() {
  const [servers, setServers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logError, setLogError] = useState("");

  const loadServers = useCallback(async () => {
    try {
      const data = await fetchServers();
      setServers(data);
    } catch (error) {
      console.error("Failed to load server statistics:", error);
    }
  }, []);

  // Load server statistics.
  useEffect(() => {
    loadServers();

    const interval = setInterval(loadServers, 30000);

    return () => clearInterval(interval);
  }, [loadServers]);

  // Fetch historical logs and continuously poll for new events.
  useEffect(() => {
    let isActive = true;
    let isFetching = false;
    let initialized = false;

    const seenLogIds = new Set();

    setLogs([]);
    setLogError("");

    async function fetchLogs() {
      if (!isActive || isFetching) return;

      isFetching = true;

      try {
        // Fetch logs from all servers.
        const response = await fetch(`${API_URL}/logs`);

        if (!response.ok) {
          throw new Error("Unable to retrieve activity logs.");
        }

        const data = await response.json();

        if (!isActive) return;

        // Sort logs by ID.
        const orderedLogs = [...data].sort(
          (a, b) => a.id - b.id
        );

        if (!initialized) {
          // Store all historical logs on initial load.
          orderedLogs.forEach((log) => seenLogIds.add(log.id));

          setLogs(orderedLogs);
          initialized = true;
        } else {
          // Identify logs that have not been displayed yet.
          const newLogs = orderedLogs.filter(
            (log) => !seenLogIds.has(log.id)
          );

          if (newLogs.length > 0) {
            newLogs.forEach((log) => seenLogIds.add(log.id));

            // Append only new logs.
            setLogs((previousLogs) => [
              ...previousLogs,
              ...newLogs,
            ]);
          }
        }

        setLogError("");
      } catch (error) {
        if (isActive) {
          setLogError(
            error.message || "Unable to connect to monitoring API."
          );
        }
      } finally {
        isFetching = false;
      }
    }

    // Fetch historical logs immediately.
    fetchLogs();

    // Poll for new logs every 500ms.
    const pollingInterval = setInterval(
      fetchLogs,
      LOG_POLL_INTERVAL
    );

    return () => {
      isActive = false;
      clearInterval(pollingInterval);
    };
  }, []);

  return (
    <main className="dashboard activity-page">
      <section className="page-heading">
        <div>
          <span className="eyebrow">SYSTEM EVENT STREAM</span>
          <h1>Activity</h1>
          <p>
            Monitor infrastructure health, alerts and system operations.
          </p>
        </div>

        <div className="activity-live">
          <span className="status-dot" />
          Live Event Stream
        </div>
      </section>

      <ServerStats servers={servers} />

      <SystemConsole
        logs={logs}
        title="Infrastructure - System Console"
        subtitle="LIVE SYSTEM HEALTH EVENTS"
        live={!logError}
        maxHeight={400}
      />

      {logError && (
        <p className="health-check-message">
          {logError}
        </p>
      )}
    </main>
  );
}

export default Activity;
