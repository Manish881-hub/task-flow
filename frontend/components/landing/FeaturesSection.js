import Link from "next/link";
import { useState } from "react";

const TAB_DATA = {
  boards: {
    title: "Task Boards",
    description: "Organize every project on a drag-and-drop board with columns that match how your team actually works.",
    items: [
      "To Do, In Progress, and Done columns with drag-and-drop",
      "Priorities, due dates, and assignees on every card",
      "Backlog search, filters, and sorting with pagination",
      "One-click task view with full history",
    ],
  },
  realtime: {
    title: "Real-time Sync",
    description: "Boards update the instant anyone acts. Open two windows and watch cards, comments, and members move live.",
    items: [
      "Native WebSocket rooms scoped per project",
      "Live task, comment, and member broadcasts",
      "Connection pill with automatic reconnect",
      "REST stays the source of truth — never stuck",
    ],
  },
  teams: {
    title: "Teams & Roles",
    description: "Invite by email, control who can do what, and give everyone a personal queue of their own work.",
    items: [
      "Email invites with owner and member roles",
      "Assigned-to-me view across all projects",
      "Per-project activity feeds for accountability",
      "Safe removal that preserves history",
    ],
  },
  workflow: {
    title: "Your Workflow",
    description: "A calm dashboard over everything: your projects, your tasks, and the latest activity — plus ⌘K search.",
    items: [
      "Dashboard with counts and recent activity",
      "Comments on every task for context",
      "Global search palette for projects and tasks",
      "JWT sessions with rotating refresh tokens",
    ],
  },
};

const CODE_SNIPPETS = {
  python: `# Sign up returns a session (token + cookie)
import requests
API = "http://localhost:8000/api/v1"
s = requests.post(f"{API}/auth/signup", json={
    "name": "Ava",
    "email": "ava@example.com",
    "password": "ava12345",
}).json()["data"]
H = {"Authorization": f"Bearer {s['access_token']}"}

# start a project and add the first task
p = requests.post(f"{API}/projects",
    json={"name": "Website redesign"}, headers=H).json()["data"]
t = requests.post(f"{API}/projects/{p['id']}/tasks",
    json={"title": "Draft homepage", "priority": "High"},
    headers=H).json()["data"]
print(p["name"], "->", t["title"], t["status"])`,

  javascript: `// Log in, then load the board
const API = "http://localhost:8000/api/v1";
const login = await fetch(\`\${API}/auth/login\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "ava@example.com", password: "ava12345" }),
}).then((r) => r.json());
const H = { Authorization: \`Bearer \${login.data.access_token}\` };

const tasks = await fetch(
  \`\${API}/projects/\${projectId}/tasks?per_page=100\`, { headers: H }
).then((r) => r.json());

// live updates over the same JWT
const ws = new WebSocket(\`ws://localhost:8000/ws?token=\${login.data.access_token}\`);
ws.onopen = () => ws.send(JSON.stringify({ action: "join", project_id: projectId }));
ws.onmessage = (e) => renderLive(JSON.parse(e.data));`,

  curl: `# create a project and watch it update live
curl -X POST $API/projects \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Website redesign"}'

# join the project's live room
# ws://localhost:8000/ws?token=$TOKEN
# -> {"action": "join", "project_id": "<id>"}`,
};

export default function FeaturesSection() {
  const [activeTab, setActiveTab] = useState("boards");
  const [activeLang, setActiveLang] = useState("python");
  const [copied, setCopied] = useState(false);

  const currentTab = TAB_DATA[activeTab];

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(CODE_SNIPPETS[activeLang]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="tuf-features-section" id="features">
      <div className="tuf-container">
        <div className="tuf-section-tag">
          <span className="tuf-section-tag-dot" />
          <span>Core platform</span>
        </div>

        <h2 className="tuf-section-title">
          One Workspace.
          <br />
          Ship Every Sprint.
        </h2>

        {/* Segmented Tabs */}
        <div className="tuf-tab-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "boards"}
            className={`tuf-tab-btn${activeTab === "boards" ? " active" : ""}`}
            onClick={() => setActiveTab("boards")}
          >
            Task Boards
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "realtime"}
            className={`tuf-tab-btn${activeTab === "realtime" ? " active" : ""}`}
            onClick={() => setActiveTab("realtime")}
          >
            Real-time Sync
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "teams"}
            className={`tuf-tab-btn${activeTab === "teams" ? " active" : ""}`}
            onClick={() => setActiveTab("teams")}
          >
            Teams & Roles
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "workflow"}
            className={`tuf-tab-btn${activeTab === "workflow" ? " active" : ""}`}
            onClick={() => setActiveTab("workflow")}
          >
            Your Workflow
          </button>
        </div>

        {/* Feature Grid Card */}
        <div className="tuf-feature-card-grid">
          {/* Left Column: Details */}
          <div className="tuf-feature-left">
            <h3>{currentTab.title}</h3>
            <p>{currentTab.description}</p>

            <div className="tuf-feature-checklist">
              {currentTab.items.map((item, idx) => (
                <div key={idx} className="tuf-feature-check-item">
                  <span className="tuf-check-bullet" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div>
              <Link href="/signup" className="tuf-btn-primary tuf-btn-primary-lg">
                Start for free
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Right Column: Code Editor Mockup */}
          <div className="tuf-code-box-wrap">
            <div className="tuf-code-card">
              <div className="tuf-code-topbar">
                <div className="tuf-code-lang-tabs">
                  <button
                    type="button"
                    className={`tuf-lang-btn${activeLang === "python" ? " active" : ""}`}
                    onClick={() => setActiveLang("python")}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#387EB8">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V8h2v4zm4 4h-2v-4h2v4zm0-6h-2V8h2v2z" />
                    </svg>
                    Python
                  </button>

                  <button
                    type="button"
                    className={`tuf-lang-btn${activeLang === "javascript" ? " active" : ""}`}
                    onClick={() => setActiveLang("javascript")}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#F7DF1E">
                      <rect width="24" height="24" rx="3" fill="#F7DF1E" />
                      <text x="5" y="18" fill="#000" fontSize="14" fontWeight="bold" fontFamily="sans-serif">JS</text>
                    </svg>
                    Javascript
                  </button>

                  <button
                    type="button"
                    className={`tuf-lang-btn${activeLang === "curl" ? " active" : ""}`}
                    onClick={() => setActiveLang("curl")}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E87F24" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M4 17l6-5-6-5" />
                      <line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                    cURL
                  </button>
                </div>

                <button type="button" className="tuf-copy-btn" onClick={handleCopy} aria-label="Copy code">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              {/* Code display with basic formatting */}
              <div className="tuf-code-content">
                <code>{CODE_SNIPPETS[activeLang]}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
