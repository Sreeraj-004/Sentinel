
export const HEALTH_LEVELS = [
  { key: "healthy", label: "Healthy", min: 0 },
  { key: "warning", label: "Warning", min: 75 },
  { key: "elevated", label: "Elevated", min: 85 },
  { key: "high", label: "High", min: 90 },
  { key: "critical", label: "Critical", min: 95 },
];

export function getResourceStatus(value) {
  if (!Number.isFinite(value)) return "unknown";
  if (value >= 95) return "critical";
  if (value >= 90) return "high";
  if (value >= 85) return "elevated";
  if (value > 75) return "warning";
  return "healthy";
}

export function getResourceMetrics(server) {
  const memoryTotal = Number(server.memory_total_gb);
  const memoryAvailable = Number(server.memory_available_gb);
  const diskTotal = Number(server.disk_total_gb);
  const diskAvailable = Number(server.disk_available_gb);

  const memoryUsed = memoryTotal - memoryAvailable;
  const diskUsed = diskTotal - diskAvailable;

  const memoryPercentage =
    memoryTotal > 0 ? (memoryUsed / memoryTotal) * 100 : NaN;

  const diskPercentage =
    diskTotal > 0 ? (diskUsed / diskTotal) * 100 : NaN;

  return {
    cpu: Number(server.cpu_percent),
    memoryUsed,
    memoryTotal,
    memoryPercentage,
    diskUsed,
    diskTotal,
    diskPercentage,
  };
}

export function getServerHealth(server) {
  const metrics = getResourceMetrics(server);

  const statuses = [
    getResourceStatus(metrics.cpu),
    getResourceStatus(metrics.memoryPercentage),
    getResourceStatus(metrics.diskPercentage),
  ];

  const priority = {
    healthy: 0,
    warning: 1,
    elevated: 2,
    high: 3,
    critical: 4,
    unknown: -1,
  };

  return statuses.reduce(
    (highest, current) =>
      priority[current] > priority[highest] ? current : highest,
    "healthy"
  );
}

export function getStoppedServices(server) {
  return (server.services || []).filter(
    (service) => service.status !== "Running"
  );
}
