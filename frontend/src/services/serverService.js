const API_BASE_URL = "http://127.0.0.1:8000/api";

export async function fetchServers() {
  const response = await fetch(`${API_BASE_URL}/servers`);

  if (!response.ok) {
    throw new Error(`Failed to fetch servers: ${response.status}`);
  }

  return response.json();
}