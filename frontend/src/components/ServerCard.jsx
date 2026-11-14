
import { useNavigate } from "react-router-dom";

import {
  Cpu,
  MemoryStick,
  HardDrive,
  Server,
  CircleCheck,
  CircleAlert,
} from "lucide-react";

import {
  getResourceStatus,
  getResourceMetrics,
  getServerHealth,
  getStoppedServices,
} from "../utils/healthStatus";

function ResourceBar({ label, icon: Icon, used, total, percentage, unit }) {
  const severity = getResourceStatus(percentage);
  const validPercentage = Number.isFinite(percentage);

  const displayPercentage = validPercentage
    ? `${percentage.toFixed(1)}%`
    : "N/A";

  const progressWidth = validPercentage
    ? Math.min(Math.max(percentage, 0), 100)
    : 0;

  return (
    <div className="resource-item">
      <div className="resource-heading">
        <span>
          <Icon size={16} />
          {label}
        </span>

        <strong>{displayPercentage}</strong>
      </div>

      <div className="progress-track">
        <div
          className={`progress-fill ${severity}`}
          style={{ width: `${progressWidth}%` }}
        />
      </div>

      {unit === "GB" && (
        <div className="resource-details">
          <span>
            {Number.isFinite(used) ? `${used.toFixed(1)} GB used` : "N/A"}
          </span>
          <span>
            {Number.isFinite(total) ? `${total.toFixed(1)} GB total` : "N/A"}
          </span>
        </div>
      )}
    </div>
  );
}

function ServerCard({ server }) {
  const navigate = useNavigate();

  const metrics = getResourceMetrics(server);
  const serverHealth = getServerHealth(server);
  const stoppedServices = getStoppedServices(server);
  const services = server.services || [];

  const statusLabels = {
    healthy: "Healthy",
    warning: "Warning",
    elevated: "Elevated",
    high: "High",
    critical: "Critical",
    unknown: "Unknown",
  };

  const openServerDetails = () => {
    navigate(`/servers/${server.id}`);
  };

  return (
    <article
      className="server-card clickable-server-card"
      onClick={openServerDetails}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openServerDetails();
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`View details for ${server.hostname}`}
    >
      <div className="server-card-header">
        <div className="server-identity">
          <div className="server-icon">
            <Server size={19} />
          </div>

          <div>
            <h3>{server.hostname}</h3>
            <span>{server.ip_address}</span>
          </div>
        </div>

        <span className={`server-status ${serverHealth}`}>
          {statusLabels[serverHealth]}
        </span>
      </div>

      {stoppedServices.length > 0 && (
        <div className="service-attention-banner">
          <CircleAlert size={14} />
          {stoppedServices.length} service
          {stoppedServices.length > 1 ? "s" : ""} require attention
        </div>
      )}

      <div className="server-resources">
        <ResourceBar
          label="CPU"
          icon={Cpu}
          percentage={metrics.cpu}
        />

        <ResourceBar
          label="Memory"
          icon={MemoryStick}
          used={metrics.memoryUsed}
          total={metrics.memoryTotal}
          percentage={metrics.memoryPercentage}
          unit="GB"
        />

        <ResourceBar
          label="Disk"
          icon={HardDrive}
          used={metrics.diskUsed}
          total={metrics.diskTotal}
          percentage={metrics.diskPercentage}
          unit="GB"
        />
      </div>

      <div className="services-section">
        <div className="services-heading">
          <span>Services</span>
          <span>
            {services.length - stoppedServices.length} / {services.length} running
          </span>
        </div>

        <div className="services-list">
          {services.map((service) => (
            <div className="service-item" key={service.id}>
              <span className="service-name">
                {service.service_name}
              </span>

              <span
                className={`service-status ${
                  service.status === "Running" ? "running" : "stopped"
                }`}
              >
                {service.status === "Running" ? (
                  <CircleCheck size={13} />
                ) : (
                  <CircleAlert size={13} />
                )}

                {service.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export default ServerCard;
