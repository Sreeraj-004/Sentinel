
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";

import ServerStats from "../components/ServerStats";
import ServerCard from "../components/ServerCard";
import { fetchServers } from "../services/serverService";

import {
  getServerHealth,
  getStoppedServices,
} from "../utils/healthStatus";

const FILTERS = [
  { key: "all", label: "All Servers" },
  { key: "healthy", label: "Healthy" },
  { key: "warning", label: "Warning" },
  { key: "elevated", label: "Elevated" },
  { key: "high", label: "High" },
  { key: "critical", label: "Critical" },
  { key: "service_attention", label: "Service Attention" },
];

function Dashboard() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const loadServers = useCallback(async () => {
    try {
      setError("");
      const data = await fetchServers();
      setServers(data);
    } catch (err) {
      setError(err.message || "Unable to connect to Sentinel API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServers();

    const interval = setInterval(loadServers, 30000);

    return () => clearInterval(interval);
  }, [loadServers]);

  const filteredServers = servers.filter((server) => {
    const matchesSearch = `${server.hostname} ${server.ip_address}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "service_attention"
        ? getStoppedServices(server).length > 0
        : getServerHealth(server) === activeFilter);

    return matchesSearch && matchesFilter;
  });

  return (
    <main className="dashboard" id="dashboard">
      <section className="page-heading">
        <div>
          <span className="eyebrow">INFRASTRUCTURE OVERVIEW</span>
          <h1>Dashboard</h1>
          <p>
            Monitor your infrastructure health and resource utilization.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={loadServers}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </section>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={loadServers}>Retry</button>
        </div>
      )}

      {loading && servers.length === 0 ? (
        <div className="loading">
          Loading infrastructure data...
        </div>
      ) : (
        !error && (
          <>
            <ServerStats servers={servers} />

            <section className="servers-section" id="servers">
              <div className="section-heading">
                <div>
                  <h2>Infrastructure Servers</h2>
                  <p>
                    Showing {filteredServers.length} of {servers.length} servers
                  </p>
                </div>

                <div className="search-box">
                  <Search size={17} />
                  <input
                    type="text"
                    placeholder="Search servers..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>

              <div className="health-filters">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    className={`health-filter ${
                      activeFilter === filter.key ? "active" : ""
                    }`}
                    onClick={() => setActiveFilter(filter.key)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="server-grid">
                {filteredServers.map((server) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                  />
                ))}
              </div>

              {filteredServers.length === 0 && (
                <div className="empty-state">
                  No matching servers found.
                </div>
              )}
            </section>
          </>
        )
      )}
    </main>
  );
}

export default Dashboard;
