
import { useCallback, useEffect, useState } from "react";

import ServerStats from "../components/ServerStats";
import SystemConsole from "../components/SystemConsole";
import { fetchServers } from "../services/serverService";

const activityLogs = [
  {
    id: 1,
    time: "17:02:41",
    level: "INFO",
    source: "SENTINEL",
    message: "Infrastructure monitoring cycle started.",
  },
  {
    id: 2,
    time: "17:02:43",
    level: "INFO",
    source: "SNTL-WEB-01",
    message: "CPU utilization: 42%. Memory utilization: 61%.",
  },
  {
    id: 3,
    time: "17:02:45",
    level: "WARNING",
    source: "SNTL-DB-01",
    message: "Disk utilization reached 87%. Resource pressure detected.",
  },
  {
    id: 4,
    time: "17:02:46",
    level: "ALERT",
    source: "SNTL-DB-01",
    message: "Disk utilization is approaching the critical threshold.",
  },
  {
    id: 5,
    time: "17:02:48",
    level: "INFO",
    source: "SENTINEL",
    message: "Historical resource trend analysis initiated.",
  },
  {
    id: 6,
    time: "17:02:50",
    level: "SUCCESS",
    source: "SNTL-APP-02",
    message: "All monitored application services are running.",
  },
  {
    id: 7,
    time: "17:02:52",
    level: "WARNING",
    source: "SNTL-FILE-01",
    message: "One monitored service is currently stopped.",
  },
  {
    id: 8,
    time: "17:02:55",
    level: "INFO",
    source: "SENTINEL",
    message: "Monitoring cycle completed.",
  },
];

function Activity() {
  const [servers, setServers] = useState([]);

  const loadServers = useCallback(async () => {
    try {
      const data = await fetchServers();
      setServers(data);
    } catch (error) {
      console.error("Failed to load server statistics:", error);
    }
  }, []);

  useEffect(() => {
    loadServers();

    const interval = setInterval(loadServers, 30000);

    return () => clearInterval(interval);
  }, [loadServers]);

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

        {/* <div className="activity-live">
          <span className="status-dot" />
          Demo Log Stream
        </div> */}
      </section>

      <ServerStats servers={servers} />

      <SystemConsole
        logs={activityLogs}
        title="Sentinel System Console"
        subtitle="EVENT LOGS"
        live={true}
      />
    </main>
  );
}

export default Activity;
