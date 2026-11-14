
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  CircleCheck,
  CircleAlert,
  RefreshCw,
  Network,
} from "lucide-react";

import {
  getResourceMetrics,
  getResourceStatus,
  getServerHealth,
  getStoppedServices,
} from "../utils/healthStatus";

import SystemConsole from "../components/SystemConsole";

const API_URL = "http://127.0.0.1:8000/api/servers";
const MONITORING_URL = "http://127.0.0.1:8000/api/monitoring";
const LOG_POLL_INTERVAL = 500;
const SERVER_POLL_INTERVAL = 1000;

const STATUS_LABELS = {
  healthy: "Healthy",
  warning: "Warning",
  elevated: "Elevated",
  high: "High",
  critical: "Critical",
  unknown: "Unknown",
};

function ResourcePanel({ title, icon: Icon, percentage, used, total }) {
  const valid = Number.isFinite(percentage);
  const severity = getResourceStatus(percentage);
  const width = valid ? Math.min(Math.max(percentage, 0), 100) : 0;

  return (
    <div className="detail-resource-card">
      <div className="detail-resource-heading">
        <div className="detail-resource-icon">
          <Icon size={20} />
        </div>
        <span>{title}</span>
      </div>

      <h2>{valid ? `${percentage.toFixed(1)}%` : "N/A"}</h2>

      <div className="progress-track">
        <div
          className={`progress-fill ${severity}`}
          style={{ width: `${width}%` }}
        />
      </div>

      <div className="detail-resource-footer">
        <span>
          {Number.isFinite(used) ? `${used.toFixed(1)} GB used` : "Utilization"}
        </span>
        <span>
          {Number.isFinite(total) ? `${total.toFixed(1)} GB total` : ""}
        </span>
      </div>

      <span className={`detail-resource-status ${severity}`}>
        {STATUS_LABELS[severity]}
      </span>
    </div>
  );
}

function ServerDetails() {
  const { serverId } = useParams();
  const navigate = useNavigate();

  const [server, setServer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [logs, setLogs] = useState([]);
  const [logError, setLogError] = useState("");

  const [checkingHealth, setCheckingHealth] = useState(false);
  const [healthCheckMessage, setHealthCheckMessage] = useState("");
  const [healthCheckError, setHealthCheckError] = useState("");

  // Fetch server details.
  useEffect(() => {
    const controller = new AbortController();

    async function loadServer() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/${serverId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Server not found."
              : "Unable to retrieve server details."
          );
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setServer(data);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to connect to Sentinel API.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadServer();

    return () => controller.abort();
  }, [serverId]);

  // Load historical logs immediately and poll for new events.
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
        const response = await fetch(`${API_URL}/${serverId}/logs`);

        if (!response.ok) {
          throw new Error("Unable to retrieve server logs.");
        }

        const data = await response.json();

        if (!isActive) return;

        const orderedLogs = [...data].sort(
          (a, b) => a.id - b.id
        );

        if (!initialized) {
          orderedLogs.forEach((log) => seenLogIds.add(log.id));

          // Load all historical logs in one update.
          setLogs(orderedLogs);
          initialized = true;
        } else {
          // Append only newly created logs.
          const newLogs = orderedLogs.filter(
            (log) => !seenLogIds.has(log.id)
          );

          if (newLogs.length > 0) {
            newLogs.forEach((log) => seenLogIds.add(log.id));

            setLogs((previousLogs) => [
              ...previousLogs,
              ...newLogs,
            ]);
          }
        }

        setLogError("");
      } catch (err) {
        if (isActive) {
          setLogError(
            err.message || "Unable to connect to monitoring API."
          );
        }
      } finally {
        isFetching = false;
      }
    }

    fetchLogs();

    const pollingInterval = setInterval(
      fetchLogs,
      LOG_POLL_INTERVAL
    );

    return () => {
      isActive = false;
      clearInterval(pollingInterval);
    };
  }, [serverId]);

  // Refresh resource metrics so the UI reflects backend updates.
  useEffect(() => {
    let isActive = true;
    let isFetching = false;

    async function refreshServer() {
      if (!isActive || isFetching) return;

      isFetching = true;

      try {
        const response = await fetch(`${API_URL}/${serverId}`);

        if (!response.ok) {
          throw new Error("Unable to refresh server details.");
        }

        const data = await response.json();

        if (isActive) {
          setServer(data);
        }
      } catch (err) {
        if (isActive) {
          setError(err.message);
        }
      } finally {
        isFetching = false;
      }
    }

    const interval = setInterval(
      refreshServer,
      SERVER_POLL_INTERVAL
    );

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [serverId]);

  async function handleHealthCheck() {
    if (checkingHealth) return;

    setCheckingHealth(true);
    setHealthCheckMessage("");
    setHealthCheckError("");

    try {
      const response = await fetch(`${MONITORING_URL}/run`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to initiate health check.");
      }

      const result = await response.json();

      setHealthCheckMessage(
        `Health check completed. ${result.servers_checked} servers checked.`
      );

      const serverResponse = await fetch(`${API_URL}/${serverId}`);

      if (serverResponse.ok) {
        const updatedServer = await serverResponse.json();
        setServer(updatedServer);
      }
    } catch (err) {
      setHealthCheckError(
        err.message || "Unable to complete health check."
      );
    } finally {
      setCheckingHealth(false);
    }
  }

  if (loading) {
    return (
      <main className="server-details-page">
        <div className="detail-message">
          <RefreshCw size={22} className="loading-icon" />
          <p>Loading server details...</p>
        </div>
      </main>
    );
  }

  if (error || !server) {
    return (
      <main className="server-details-page">
        <div className="detail-message">
          <CircleAlert size={28} />
          <h2>{error || "Server not found."}</h2>

          <button
            className="detail-back-button"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const metrics = getResourceMetrics(server);
  const health = getServerHealth(server);
  const stoppedServices = getStoppedServices(server);
  const services = server.services || [];

  return (
    <main className="server-details-page">
      <button
        className="detail-back-button"
        onClick={() => navigate("/dashboard")}
      >
        <ArrowLeft size={17} />
        Back to Dashboard
      </button>

      <section className="server-detail-hero">
        <div className="server-detail-identity">
          <div className="server-detail-icon">
            <Server size={30} />
          </div>

          <div>
            <span className="eyebrow">SERVER OVERVIEW</span>
            <h1>{server.hostname}</h1>

            <div className="server-detail-ip">
              <Network size={15} />
              {server.ip_address}
            </div>
          </div>
        </div>

        <div className={`server-health-panel ${health}`}>
          <span className="health-panel-label">
            CURRENT HEALTH STATUS
          </span>

          <h2>{STATUS_LABELS[health]}</h2>

          <span>
            {health === "critical"
              ? "Immediate attention required"
              : health === "high"
                ? "High resource utilization detected"
                : health === "elevated"
                  ? "Resource utilization is elevated"
                  : health === "warning"
                    ? "Resource utilization requires monitoring"
                    : health === "healthy"
                      ? "All monitored resources are within healthy limits"
                      : "Resource health cannot be determined"}
          </span>
        </div>
      </section>

      <section className="server-detail-section">
        <div className="detail-section-heading">
          <div>
            <span className="eyebrow">RESOURCE MONITORING</span>
            <h2>Resource Utilization</h2>
          </div>
        </div>

        <div className="detail-resource-grid">
          <ResourcePanel
            title="CPU Utilization"
            icon={Cpu}
            percentage={metrics.cpu}
          />

          <ResourcePanel
            title="Memory Utilization"
            icon={MemoryStick}
            percentage={metrics.memoryPercentage}
            used={metrics.memoryUsed}
            total={metrics.memoryTotal}
          />

          <ResourcePanel
            title="Disk Utilization"
            icon={HardDrive}
            percentage={metrics.diskPercentage}
            used={metrics.diskUsed}
            total={metrics.diskTotal}
          />
        </div>
      </section>

      <section className="server-detail-section">
        <div className="detail-section-heading">
          <div>
            <span className="eyebrow">SYSTEM ACTIVITY</span>
            <h2>Live Server Console</h2>
          </div>

          <button
            className="check-health-button"
            onClick={handleHealthCheck}
            disabled={checkingHealth}
          >
            <RefreshCw
              size={16}
              className={checkingHealth ? "loading-icon" : ""}
            />
            {checkingHealth ? "Checking..." : "Check Health"}
          </button>
        </div>

        {healthCheckMessage && (
          <p className="health-check-message">{healthCheckMessage}</p>
        )}

        {healthCheckError && (
          <div className="service-attention-banner detail-service-banner">
            <CircleAlert size={16} />
            {healthCheckError}
          </div>
        )}

        <SystemConsole
          logs={logs}
          title={`${server.hostname} - System Console`}
          subtitle="SERVER HEALTH EVENTS"
          live={!logError}
          maxHeight={400}
        />
      </section>

      <section className="server-detail-section">
        <div className="detail-section-heading">
          <div>
            <span className="eyebrow">SERVICE MONITORING</span>
            <h2>Server Services</h2>
          </div>

          <span className="service-summary">
            {services.length - stoppedServices.length} / {services.length} Running
          </span>
        </div>

        {stoppedServices.length > 0 && (
          <div className="service-attention-banner detail-service-banner">
            <CircleAlert size={16} />
            {stoppedServices.length} service
            {stoppedServices.length > 1 ? "s" : ""} require attention
          </div>
        )}

        <div className="detail-services-list">
          {services.length > 0 ? (
            services.map((service) => (
              <div className="detail-service-item" key={service.id}>
                <div>
                  <Server size={17} />
                  <span>{service.service_name}</span>
                </div>

                <span
                  className={`service-status ${
                    service.status === "Running" ? "running" : "stopped"
                  }`}
                >
                  {service.status === "Running" ? (
                    <CircleCheck size={14} />
                  ) : (
                    <CircleAlert size={14} />
                  )}

                  {service.status}
                </span>
              </div>
            ))
          ) : (
            <div className="empty-state">
              No services are registered for this server.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default ServerDetails;
