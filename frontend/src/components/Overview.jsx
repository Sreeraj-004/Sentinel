import {
  Server,
  ShieldCheck,
  AlertTriangle,
  CircleStop,
} from "lucide-react";

function Overview({ servers }) {
  const totalServers = servers.length;

  const criticalServers = servers.filter((server) => {
    const memoryUsed =
      ((server.memory_total_gb - server.memory_available_gb) /
        server.memory_total_gb) * 100;

    const diskUsed =
      ((server.disk_total_gb - server.disk_available_gb) /
        server.disk_total_gb) * 100;

    return (
      server.cpu_percent >= 85 ||
      memoryUsed >= 85 ||
      diskUsed >= 85
    );
  }).length;

  const stoppedServices = servers.reduce(
    (total, server) =>
      total +
      server.services.filter((service) => service.status !== "Running").length,
    0
  );

  const healthyServers = totalServers - criticalServers;

  const metrics = [
    {
      label: "Total Servers",
      value: totalServers,
      icon: Server,
      color: "blue",
    },
    {
      label: "Healthy Servers",
      value: healthyServers,
      icon: ShieldCheck,
      color: "green",
    },
    {
      label: "Critical Servers",
      value: criticalServers,
      icon: AlertTriangle,
      color: "red",
    },
    {
      label: "Stopped Services",
      value: stoppedServices,
      icon: CircleStop,
      color: "orange",
    },
  ];

  return (
    <div className="overview-grid">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <div className="overview-card" key={metric.label}>
            <div className={`overview-icon ${metric.color}`}>
              <Icon size={21} />
            </div>

            <div>
              <p>{metric.label}</p>
              <h2>{metric.value}</h2>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Overview;