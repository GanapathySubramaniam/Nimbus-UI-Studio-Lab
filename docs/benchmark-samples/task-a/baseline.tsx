export function MetricsHeader() {
  return (
    <div className="metrics-header">
      <div className="metrics-header-row">
        <h2 className="metrics-heading">Portfolio overview</h2>
        <button type="button" className="btn btn-solid btn-accent">
          New agent run
        </button>
      </div>
      <div className="stat-tile-row">
        <div className="stat-tile">
          <span className="stat-label">Active agents</span>
          <strong className="stat-value">24</strong>
          <small className="stat-trend">↗ 12%</small>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Tasks completed</span>
          <strong className="stat-value">1,284</strong>
          <small className="stat-trend">↗ 8.4%</small>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Success rate</span>
          <strong className="stat-value">98.6%</strong>
        </div>
      </div>
    </div>
  );
}
