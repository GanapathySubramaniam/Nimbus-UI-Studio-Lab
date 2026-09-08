export function AgentStatusPanel() {
  return (
    <div className="agent-panel">
      <article className="agent-card">
        <span className="agent-badge">Ready</span>
        <h3 className="agent-name">Research agent</h3>
        <p className="agent-meta">12 tools connected</p>
      </article>
      <div className="prompt-field">
        <h4 className="prompt-title">Message assistant</h4>
        <textarea className="prompt-input" readOnly value="Summarize this run" />
        <div className="prompt-actions">
          <span className="prompt-hint">Preview · Messages are not sent</span>
          <button type="button" className="btn btn-solid">
            Send message
          </button>
        </div>
      </div>
    </div>
  );
}
