
import { useEffect, useState } from "react";
import {
  FileCode,
  FolderOpen,
  Plus,
  Save,
  Trash2,
  Code2,
  RefreshCw,
} from "lucide-react";

import {
  fetchScripts,
  createScript,
  updateScript,
  deleteScript,
} from "../services/scriptService";

function Scripts() {
  const [scripts, setScripts] = useState([]);
  const [selectedScript, setSelectedScript] = useState(null);
  const [draft, setDraft] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isDirty =
    selectedScript &&
    draft &&
    (
      draft.name !== selectedScript.name ||
      draft.language !== selectedScript.language ||
      draft.description !== selectedScript.description ||
      draft.when_to_use !== (selectedScript.when_to_use ?? "") ||
      draft.why_to_use !== (selectedScript.why_to_use ?? "") ||
      draft.content !== selectedScript.content
    );

  useEffect(() => {
    let active = true;

    async function loadScripts() {
      try {
        setError("");

        const data = await fetchScripts();

        if (!active) return;

        setScripts(data);

        if (data.length > 0) {
          setSelectedScript(data[0]);
          setDraft({
            when_to_use: "",
            why_to_use: "",
            ...data[0],
          });
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load scripts.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadScripts();

    return () => {
      active = false;
    };
  }, []);

  function openScript(script) {
    if (isDirty && !window.confirm("Discard your unsaved changes?")) {
      return;
    }

    setSelectedScript(script);
    setDraft({
      when_to_use: "",
      why_to_use: "",
      ...script,
    });
    setError("");
    setMessage("");
  }

  function updateDraft(field, value) {
    setDraft((previous) => ({
      ...previous,
      [field]: value,
    }));

    setMessage("");
  }

  async function handleCreateScript() {
    if (isDirty && !window.confirm("Discard your unsaved changes?")) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const newScript = await createScript({
        name: `new_script_${Date.now()}.ps1`,
        language: "powershell",
        description: "New Sentinel automation script.",
        when_to_use: "",
        why_to_use: "",
        content: "",
      });

      setScripts((previous) =>
        [...previous, newScript].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );

      setSelectedScript(newScript);
      setDraft({ ...newScript });
      setMessage("New script created successfully.");
    } catch (err) {
      setError(err.message || "Unable to create script.");
    }
  }

  async function handleSave() {
    if (!selectedScript || !draft || !isDirty) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const updatedScript = await updateScript(
        selectedScript.id,
        {
          name: draft.name.trim(),
          language: draft.language,
          description: draft.description,
          when_to_use: draft.when_to_use ?? "",
          why_to_use: draft.why_to_use ?? "",
          content: draft.content,
        }
      );

      setSelectedScript(updatedScript);
      setDraft({ ...updatedScript });

      setScripts((previous) =>
        previous
          .map((script) =>
            script.id === updatedScript.id
              ? updatedScript
              : script
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      setMessage("Script saved successfully.");
    } catch (err) {
      setError(err.message || "Unable to save script.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedScript) return;

    const confirmed = window.confirm(
      `Delete ${selectedScript.name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      await deleteScript(selectedScript.id);

      const remainingScripts = scripts.filter(
        (script) => script.id !== selectedScript.id
      );

      setScripts(remainingScripts);

      if (remainingScripts.length > 0) {
        setSelectedScript(remainingScripts[0]);
        setDraft({
          when_to_use: "",
          why_to_use: "",
          ...remainingScripts[0],
        });
      } else {
        setSelectedScript(null);
        setDraft(null);
      }

      setMessage("Script deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete script.");
    }
  }

  if (loading) {
    return (
      <main className="dashboard scripts-page">
        <div className="scripts-loading">
          <RefreshCw size={20} className="loading-icon" />
          Loading script library...
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard scripts-page">
      <section className="page-heading">
        <div>
          <span className="eyebrow">AUTOMATION LIBRARY</span>
          <h1>Scripts</h1>
          <p>
            Manage and maintain your infrastructure automation scripts.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={handleCreateScript}
        >
          <Plus size={16} />
          New Script
        </button>
      </section>

      {error && (
        <div className="scripts-error">{error}</div>
      )}

      {message && (
        <div className="script-message">{message}</div>
      )}

      <section className="script-workspace">
        <aside className="script-sidebar">
          <div className="script-sidebar-heading">
            <FolderOpen size={17} />
            <span>EXPLORER</span>
            <span className="script-count">{scripts.length}</span>
          </div>

          <div className="script-folder">
            <div className="folder-label">
              <FolderOpen size={15} />
              scripts
            </div>

            {scripts.map((script) => (
              <button
                key={script.id}
                className={`script-file ${
                  selectedScript?.id === script.id ? "selected" : ""
                }`}
                onClick={() => openScript(script)}
              >
                <FileCode size={15} />
                <span>{script.name}</span>
              </button>
            ))}

            {scripts.length === 0 && (
              <p className="scripts-empty-list">
                No scripts available.
              </p>
            )}
          </div>
        </aside>

        <section className="script-editor">
          {selectedScript && draft ? (
            <>
              <div className="editor-header">
                <div className="editor-file-name">
                  <Code2 size={16} />
                  <span>{draft.name}</span>

                  {isDirty && (
                    <span className="unsaved-indicator">●</span>
                  )}
                </div>

                <div className="editor-actions">
                  <button
                    className="script-delete-button"
                    onClick={handleDelete}
                    disabled={saving}
                    title="Delete script"
                  >
                    <Trash2 size={16} />
                  </button>

                  <button
                    className="refresh-button"
                    onClick={handleSave}
                    disabled={saving || !isDirty}
                  >
                    <Save size={16} />
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>

              {/* 01 - Script Details */}
              <section className="script-info-panel">
                <div className="editor-section-heading">
                  <span>01</span>
                  <div>
                    <h3>Script Details</h3>
                    <p>
                      Define the script identity and configuration.
                    </p>
                  </div>
                </div>

                <div className="script-metadata">
                  <input
                    value={draft.name}
                    onChange={(event) =>
                      updateDraft("name", event.target.value)
                    }
                    placeholder="Script filename"
                    maxLength={150}
                  />

                  <select
                    value={draft.language}
                    onChange={(event) =>
                      updateDraft("language", event.target.value)
                    }
                  >
                    <option value="powershell">PowerShell</option>
                    <option value="python">Python</option>
                    <option value="bash">Bash</option>
                  </select>
                </div>

                <input
                  className="script-description"
                  value={draft.description ?? ""}
                  onChange={(event) =>
                    updateDraft("description", event.target.value)
                  }
                  placeholder="Add a description..."
                  maxLength={500}
                />
              </section>

              {/* 02 - Execution Guidance */}
              <section className="script-guidance-panel">
                <div className="editor-section-heading">
                  <span>02</span>
                  <div>
                    <h3>Execution Guidance</h3>
                    <p>
                      Help Sentinel understand when and why to select this script.
                    </p>
                  </div>
                </div>

                <div className="script-guidance">
                  <div className="guidance-field when-field">
                    <label htmlFor="when-to-use">WHEN TO USE</label>
                    <textarea
                      id="when-to-use"
                      value={draft.when_to_use ?? ""}
                      onChange={(event) =>
                        updateDraft("when_to_use", event.target.value)
                      }
                      placeholder="Define the conditions under which Sentinel should consider this script..."
                      rows={4}
                    />
                  </div>

                  <div className="guidance-field why-field">
                    <label htmlFor="why-to-use">WHY TO USE</label>
                    <textarea
                      id="why-to-use"
                      value={draft.why_to_use ?? ""}
                      onChange={(event) =>
                        updateDraft("why_to_use", event.target.value)
                      }
                      placeholder="Explain the problem this script solves and the expected benefit..."
                      rows={4}
                    />
                  </div>
                </div>
              </section>

              {/* 03 - Source Code */}
              <div className="editor-section-heading code-section-heading">
                <span>03</span>
                <div>
                  <h3>Source Code</h3>
                  <p>Automation script implementation.</p>
                </div>
              </div>

              <div className="code-editor">
                <textarea
                  value={draft.content ?? ""}
                  onChange={(event) =>
                    updateDraft("content", event.target.value)
                  }
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  placeholder="Write your automation script here..."
                />
              </div>

              <div className="editor-footer">
                <span>{draft.language.toUpperCase()}</span>
                <span>
                  {(draft.content ?? "").split("\n").length} lines
                </span>
                <span>UTF-8</span>
                <span>
                  {isDirty ? "Unsaved changes" : "All changes saved"}
                </span>
              </div>
            </>
          ) : (
            <div className="script-empty-state">
              <FileCode size={42} />
              <h3>No script selected</h3>
              <p>
                Select a script from the explorer or create a new one.
              </p>

              <button
                className="refresh-button"
                onClick={handleCreateScript}
              >
                <Plus size={16} />
                Create Script
              </button>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default Scripts;
