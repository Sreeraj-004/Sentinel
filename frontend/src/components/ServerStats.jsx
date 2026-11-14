
import {
  Server,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Activity,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

import {
  getServerHealth,
  getStoppedServices,
} from "../utils/healthStatus";

function ServerStats({ servers = [] }) {
  const counts = {
    healthy: 0,
    warning: 0,
    elevated: 0,
    high: 0,
    critical: 0,
  };

  let serviceAttention = 0;

  servers.forEach((server) => {
    const status = getServerHealth(server);

    if (counts[status] !== undefined) {
      counts[status] += 1;
    }

    if (getStoppedServices(server).length > 0) {
      serviceAttention += 1;
    }
  });

  const metrics = [
    {
      label: "Healthy",
      value: counts.healthy,
      icon: ShieldCheck,
      color: "green",
    },
    {
      label: "Warning",
      value: counts.warning,
      icon: Eye,
      color: "orange",
    },
    {
      label: "Elevated",
      value: counts.elevated,
      icon: Activity,
      color: "amber",
    },
    {
      label: "High",
      value: counts.high,
      icon: TrendingUp,
      color: "orange",
    },
    {
      label: "Critical",
      value: counts.critical,
      icon: AlertTriangle,
      color: "red",
    },
  ];

  return (
    <section className="overview-grid">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <article className="overview-card" key={metric.label}>
            <div className={`overview-icon ${metric.color}`}>
              <Icon size={21} />
            </div>

            <div className="overview-content">
              <p>{metric.label}</p>
              <h2>{metric.value}</h2>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export default ServerStats;
