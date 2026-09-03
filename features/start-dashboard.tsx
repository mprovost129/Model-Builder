export type DashboardRecentProject = {
  id: string;
  name: string;
  openedAt: string;
  updatedAt: string;
};

type StartDashboardProps = {
  currentProjectDirty: boolean;
  currentProjectName: string;
  hasActiveProject: boolean;
  onContinueProject: () => void;
  onNewPlan: () => void;
  onOpenProject: () => void;
  onOpenRecentProject: (projectId: string) => void;
  onRemoveRecentProject: (projectId: string) => void;
  recentProjects: DashboardRecentProject[];
};

function formatDashboardDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

export function StartDashboard({
  currentProjectDirty,
  currentProjectName,
  hasActiveProject,
  onContinueProject,
  onNewPlan,
  onOpenProject,
  onOpenRecentProject,
  onRemoveRecentProject,
  recentProjects,
}: StartDashboardProps) {
  return (
    <section className="start-dashboard" aria-label="Slater Woods Omni Design dashboard">
      <header className="dashboard-hero">
        <div className="dashboard-brand-mark" aria-hidden="true"><span /><span /><span /></div>
        <div>
          <span>SLATER WOODS</span>
          <h1>Omni Design</h1>
          <p>Residential design from first sketch through coordinated 3D model.</p>
        </div>
      </header>

      <div className="dashboard-grid">
        <section className="dashboard-column dashboard-start-column" aria-labelledby="dashboard-start-title">
          <header><span>START</span><h2 id="dashboard-start-title">Begin a project</h2></header>
          <div className="dashboard-start-actions">
            <button type="button" className="dashboard-primary-action" onClick={onNewPlan}>
              <b aria-hidden="true">＋</b><span><strong>New Plan</strong><small>Blank model in 2D Top view</small></span>
            </button>
            <button type="button" onClick={onOpenProject}>
              <b aria-hidden="true">▱</b><span><strong>Open Project</strong><small>Choose a saved .mbproj file</small></span>
            </button>
            {hasActiveProject ? (
              <button type="button" onClick={onContinueProject}>
                <b aria-hidden="true">↗</b><span><strong>Continue Current Project</strong><small>{currentProjectName}{currentProjectDirty ? " · unsaved changes" : ""}</small></span>
              </button>
            ) : null}
          </div>

          <section className="dashboard-workflow" aria-labelledby="dashboard-workflow-title">
            <h3 id="dashboard-workflow-title">Recommended workflow</h3>
            <ol>
              <li><b>1</b><span><strong>Project settings</strong><small>Stories, slabs, floors, and ceiling heights</small></span></li>
              <li><b>2</b><span><strong>Draw the structure</strong><small>Foundation and layered wall types</small></span></li>
              <li><b>3</b><span><strong>Add openings</strong><small>Doors, windows, and framing assemblies</small></span></li>
              <li><b>4</b><span><strong>Review rooms</strong><small>Room types, labels, and local overrides</small></span></li>
            </ol>
          </section>
        </section>

        <section className="dashboard-column dashboard-recent-column" aria-labelledby="dashboard-recent-title">
          <header><span>RECENT PROJECTS</span><h2 id="dashboard-recent-title">Pick up where you left off</h2></header>
          {recentProjects.length ? (
            <div className="dashboard-recent-list">
              {recentProjects.map((project) => (
                <article className="dashboard-recent-project" key={project.id}>
                  <button type="button" className="dashboard-recent-open" onClick={() => onOpenRecentProject(project.id)}>
                    <span className="dashboard-file-icon" aria-hidden="true">▱</span>
                    <span><strong>{project.name}</strong><small>Last opened {formatDashboardDate(project.openedAt)}</small></span>
                    <i>OPEN</i>
                  </button>
                  <button type="button" className="dashboard-recent-remove" onClick={() => onRemoveRecentProject(project.id)} aria-label={`Remove ${project.name} from recent projects`} title="Remove from recent projects">×</button>
                </article>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-recent">
              <span aria-hidden="true">▱</span>
              <strong>No recent projects yet</strong>
              <p>Projects you save or open will appear here for quick access on this browser.</p>
              <button type="button" onClick={onOpenProject}>Open a Project</button>
            </div>
          )}
          <p className="dashboard-storage-note"><b>Local convenience copies</b> make recent projects easy to reopen on this device. Keep your downloaded .mbproj files as the portable project record.</p>
        </section>

        <aside className="dashboard-column dashboard-resources" aria-labelledby="dashboard-resources-title">
          <header><span>RESOURCES</span><h2 id="dashboard-resources-title">Help and reference</h2></header>
          <div className="dashboard-resource-list">
            <div><b aria-hidden="true">?</b><span><strong>Getting Started</strong><small>Guided lessons are being prepared.</small></span><i>SOON</i></div>
            <div><b aria-hidden="true">▦</b><span><strong>Product Catalogs</strong><small>Manufacturer libraries will appear here.</small></span><i>SOON</i></div>
            <div><b aria-hidden="true">⌘</b><span><strong>Keyboard Reference</strong><small>Shortcut documentation is planned.</small></span><i>SOON</i></div>
          </div>
          <section className="dashboard-status-card">
            <span>WORKSPACE STATUS</span>
            <strong><i /> Local recovery is active</strong>
            <p>Unsaved work is recoverable on this browser. Use Save for a portable project file.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}
