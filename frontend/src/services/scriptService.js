
const API_BASE_URL = "http://127.0.0.1:8000/api";

async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.detail || `Request failed with status ${response.status}`
    );
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function fetchScripts() {
  const response = await fetch(`${API_BASE_URL}/scripts`);
  return handleResponse(response);
}

export async function createScript(payload) {
  const response = await fetch(`${API_BASE_URL}/scripts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function updateScript(scriptId, payload) {
  const response = await fetch(`${API_BASE_URL}/scripts/${scriptId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function deleteScript(scriptId) {
  const response = await fetch(`${API_BASE_URL}/scripts/${scriptId}`, {
    method: "DELETE",
  });

  return handleResponse(response);
}
