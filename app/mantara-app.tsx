"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { signIn, signOut } from "next-auth/react";

type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
};

type TaskPriority = "low" | "normal" | "high";
type TaskStatus = "todo" | "doing" | "done";
type ViewId = "capture" | "inbox" | "today" | "projects" | "search" | "settings";

type Project = {
  id: string;
  name: string;
  type: string;
  client_name: string | null;
  description: string | null;
  status: "active" | "paused" | "archived" | "completed";
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  open_task_count?: number;
  note_count?: number;
};

type Capture = {
  id: string;
  input_type: "voice" | "text";
  raw_transcript: string | null;
  processing_status: string;
  created_at: string;
  processed_at: string | null;
};

type Note = {
  id: string;
  project_id: string | null;
  capture_id: string | null;
  title: string;
  body: string;
  ai_summary: string | null;
  status: "inbox" | "accepted" | "archived";
  accepted_by: "user" | "ai" | null;
  confidence: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

type Task = {
  id: string;
  project_id: string | null;
  note_id: string | null;
  capture_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type InboxItem = {
  note: Note;
  project_match: {
    project_id: string | null;
    project_name: string | null;
    confidence: number | null;
  };
  excerpt: string;
  task_count: number;
  tags: string[];
};

type Settings = {
  id: string;
  auto_validate_high_confidence: boolean;
  manual_review_all_captures: boolean;
  default_task_priority: TaskPriority;
  created_at: string;
  updated_at: string;
};

type AnalysisResult = {
  title: string;
  clean_note: string;
  project_match: {
    project_id: string | null;
    project_name: string | null;
    confidence: number;
    reason: string;
  } | null;
  suggest_create_project: boolean;
  tasks: Array<{
    title: string;
    due_date: string | null;
    priority: TaskPriority;
  }>;
  tags: string[];
  needs_review: boolean;
};

type CaptureResult = {
  capture: Capture;
  note: Note;
  tasks: Task[];
  analysis: AnalysisResult;
  auto_validated: boolean;
};

type CaptureBundle = {
  capture: Capture;
  note: Note | null;
  tasks: Task[];
};

type ProjectDetail = {
  project: Project;
  notes: Note[];
  tasks: Task[];
  captures: Capture[];
};

type SearchResult = {
  type: "project" | "note" | "task";
  id: string;
  title: string;
  project_id: string | null;
  project_name: string | null;
  snippet: string;
  matches: Array<{ field: string; value: string }>;
};

type ApiErrorBody = {
  error?: {
    message?: string;
    code?: string;
  };
};

type TaskDraft = {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
};

const VIEWS: Array<{
  id: ViewId;
  label: string;
  short: string;
  icon: string;
}> = [
  { id: "capture", label: "Capture", short: "Capture", icon: "◎" },
  { id: "inbox", label: "Inbox", short: "Inbox", icon: "▤" },
  { id: "today", label: "Aujourd'hui", short: "Auj.", icon: "◷" },
  { id: "projects", label: "Projets", short: "Projets", icon: "▦" },
  { id: "search", label: "Recherche", short: "Recherche", icon: "⌕" },
];

const PROJECT_COLORS = ["#b5502f", "#3f6b8c", "#4f6b4a", "#8a5a86", "#c08a2e"];

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const isForm = init.body instanceof FormData;
  if (init.body && !isForm && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as ApiErrorBody;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Requete impossible.");
  }
  return payload as T;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function initials(name: string | null | undefined, email: string | null | undefined) {
  const source = name?.trim() || email?.split("@")[0] || "Mantara";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function projectColor(projectId: string | null, projects: Project[]) {
  if (!projectId) {
    return "var(--faint)";
  }
  const index = projects.findIndex((project) => project.id === projectId);
  return PROJECT_COLORS[Math.max(0, index) % PROJECT_COLORS.length];
}

function projectName(projectId: string | null, projects: Project[]) {
  if (!projectId) {
    return "Sans projet";
  }
  return projects.find((project) => project.id === projectId)?.name ?? "Projet";
}

function confidenceKind(value: number | null | undefined) {
  const confidence = value ?? 0;
  if (confidence >= 0.8) {
    return "high";
  }
  if (confidence >= 0.5) {
    return "medium";
  }
  return "low";
}

function confidenceLabel(value: number | null | undefined) {
  const kind = confidenceKind(value);
  if (kind === "high") {
    return "confiance forte";
  }
  if (kind === "medium") {
    return "confiance moyenne";
  }
  return "confiance faible";
}

function formatConfidence(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "0.00";
}

function statusLabel(status: Project["status"]) {
  const labels: Record<Project["status"], string> = {
    active: "ACTIF",
    paused: "EN PAUSE",
    archived: "ARCHIVE",
    completed: "TERMINE",
  };
  return labels[status];
}

function priorityLabel(priority: TaskPriority) {
  const labels: Record<TaskPriority, string> = {
    low: "BASSE",
    normal: "NORMALE",
    high: "HAUTE",
  };
  return labels[priority];
}

function priorityText(priority: TaskPriority) {
  const labels: Record<TaskPriority, string> = {
    low: "Basse",
    normal: "Normale",
    high: "Haute",
  };
  return labels[priority];
}

function dueLabel(date: string | null) {
  if (!date) {
    return null;
  }
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function relativeDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.round(diff / 36e5);
  if (hours <= 1) {
    return "il y a 1 h";
  }
  if (hours < 24) {
    return `il y a ${hours} h`;
  }
  const days = Math.round(hours / 24);
  if (days === 1) {
    return "hier";
  }
  return `il y a ${days} j`;
}

function taskDraftFromTask(task: Task): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
  };
}

function highlight(value: string, query: string) {
  if (!query.trim()) {
    return value;
  }
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = value.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={`${part}-${index}`}>{part}</mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

export default function MantaraApp({
  initialUser,
}: {
  initialUser: SessionUser | null;
}) {
  const [user, setUser] = useState(initialUser);

  if (!user) {
    return (
      <AuthScreen
        onAuthenticated={() => {
          window.location.reload();
        }}
      />
    );
  }

  return <Workspace user={user} onSignedOut={() => setUser(null)} />;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("Jean Mercier");
  const [email, setEmail] = useState("jean@mantara.co");
  const [password, setPassword] = useState("mantara-dev");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        await apiFetch<{ user: SessionUser }>("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, email, password }),
        });
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("Identifiants invalides.");
      }
      onAuthenticated();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Connexion impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <BrandMark />
        <div>
          <p className="eyebrow">Voice Inbox</p>
          <h1>« Dicter, comprendre, classer, agir. »</h1>
        </div>
        <p className="mono-muted">Capture sans friction</p>
      </section>

      <section className="auth-form-panel">
        <div className="mobile-status">
          <span>9:41</span>
          <span>● ● ●</span>
        </div>
        <div className="mobile-brand-row">
          <BrandMark compact />
        </div>
        {mode === "register" ? (
          <button className="back-link" type="button" onClick={() => setMode("login")}>
            ← Connexion
          </button>
        ) : null}

        <form className="auth-form" onSubmit={submit}>
          <div>
            <h2>{mode === "login" ? "Bon retour." : "Créer votre espace."}</h2>
            <p>
              {mode === "login"
                ? "Videz votre tête. On classe le reste."
                : "Un e-mail de vérification vous sera envoyé."}
            </p>
          </div>

          {mode === "register" ? (
            <label className="field">
              <span>Nom</span>
              <input
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          ) : null}

          <label className="field">
            <span>E-mail</span>
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Mot de passe</span>
            <div className="password-row">
              <input
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="text-button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </div>
          </label>

          {mode === "register" ? (
            <div className="strength-bars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span className={password.length >= 12 ? "" : "muted"} />
            </div>
          ) : (
            <button className="forgot-link" type="button">
              Mot de passe oublié ?
            </button>
          )}

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button wide" type="submit" disabled={busy}>
            {busy
              ? "Traitement..."
              : mode === "login"
                ? "Se connecter"
                : "Créer le compte"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <>
              Pas de compte ?{" "}
              <button type="button" onClick={() => setMode("register")}>
                Créer un compte
              </button>
            </>
          ) : (
            "En continuant, vous acceptez les conditions d'utilisation de Mantara."
          )}
        </div>
      </section>
    </main>
  );
}

function Workspace({
  user,
  onSignedOut,
}: {
  user: SessionUser;
  onSignedOut: () => void;
}) {
  const [view, setView] = useState<ViewId>("capture");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [selectedCaptureId, setSelectedCaptureId] = useState<string | null>(null);
  const [captureBundle, setCaptureBundle] = useState<CaptureBundle | null>(null);

  async function refreshData(silent = false) {
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const [inboxPayload, projectPayload, taskPayload, settingsPayload] =
        await Promise.all([
          apiFetch<{ items: InboxItem[] }>("/api/inbox"),
          apiFetch<{ projects: Project[] }>("/api/projects"),
          apiFetch<{ tasks: Task[] }>("/api/tasks"),
          apiFetch<{ settings: Settings }>("/api/settings"),
        ]);
      setInbox(inboxPayload.items);
      setProjects(projectPayload.projects);
      setTasks(taskPayload.tasks);
      setSettings(settingsPayload.settings);
      if (!selectedProjectId && projectPayload.projects[0]) {
        setSelectedProjectId(projectPayload.projects[0].id);
      }
      if (!selectedCaptureId && inboxPayload.items[0]?.note.capture_id) {
        setSelectedCaptureId(inboxPayload.items[0].note.capture_id);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Chargement impossible.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadProject(id: string) {
    setError(null);
    try {
      const detail = await apiFetch<ProjectDetail>(`/api/projects/${id}`);
      setProjectDetail(detail);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Projet indisponible.");
    }
  }

  async function loadCapture(id: string) {
    setError(null);
    try {
      const detail = await apiFetch<CaptureBundle>(`/api/captures/${id}`);
      setCaptureBundle(detail);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Capture indisponible.",
      );
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshData();
    }, 0);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (selectedProjectId) {
        void loadProject(selectedProjectId);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [selectedProjectId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (selectedCaptureId) {
        void loadCapture(selectedCaptureId);
      } else {
        setCaptureBundle(null);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [selectedCaptureId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setView("search");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function updateTask(task: Task, patch: Partial<Task>) {
    const payload = await apiFetch<{ task: Task }>(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setTasks((current) =>
      current.map((item) => (item.id === payload.task.id ? payload.task : item)),
    );
    if (selectedProjectId) {
      void loadProject(selectedProjectId);
    }
  }

  async function handleSignedOut() {
    await signOut({ redirect: false });
    onSignedOut();
  }

  const activeInboxCount = inbox.length;
  const activeView = VIEWS.find((item) => item.id === view) ?? VIEWS[0];

  return (
    <main className="workspace-shell">
      <Sidebar
        user={user}
        view={view}
        inboxCount={activeInboxCount}
        onViewChange={setView}
        onSignOut={handleSignedOut}
      />

      <section className={cx("workspace-main", view === "capture" && "capture-main")}>
        {view === "capture" ? (
          <header className="mobile-capture-header">
            <div className="mobile-status-bar">
              <span>9:41</span>
              <span>● ● ●</span>
            </div>
            <div className="mobile-capture-title-row">
              <h1>Capture</h1>
              <button
                className="command-button"
                type="button"
                title="Recherche"
                onClick={() => setView("search")}
              >
                ⌘
              </button>
            </div>
          </header>
        ) : (
          <header className="mobile-app-header">
            <div>
              <p className="eyebrow">Mantara</p>
              <h1>{activeView.label}</h1>
            </div>
            <div className="header-actions">
              <button
                className="icon-button"
                type="button"
                title="Recherche"
                onClick={() => setView("search")}
              >
                ⌕
              </button>
              <button
                className="icon-button"
                type="button"
                title="Paramètres"
                onClick={() => setView("settings")}
              >
                ⚙
              </button>
            </div>
          </header>
        )}

        {notice ? (
          <button className="notice" type="button" onClick={() => setNotice(null)}>
            {notice}
          </button>
        ) : null}
        {error ? (
          <button className="notice error" type="button" onClick={() => setError(null)}>
            {error}
          </button>
        ) : null}

        {loading ? (
          <LoadingView />
        ) : (
          <>
            {view === "capture" ? (
              <CaptureView
                projects={projects}
                onResult={async (message) => {
                  setNotice(message);
                  await refreshData(true);
                }}
                onOpenInbox={(captureId) => {
                  setSelectedCaptureId(captureId);
                  setView("inbox");
                }}
                onOpenProject={(projectId) => {
                  setSelectedProjectId(projectId);
                  setView("projects");
                }}
              />
            ) : null}
            {view === "inbox" ? (
              <InboxView
                items={inbox}
                projects={projects}
                bundle={captureBundle}
                selectedCaptureId={selectedCaptureId}
                onSelect={(captureId) => setSelectedCaptureId(captureId)}
                onChanged={async (message) => {
                  setNotice(message);
                  await refreshData(true);
                  if (selectedCaptureId) {
                    await loadCapture(selectedCaptureId);
                  }
                }}
              />
            ) : null}
            {view === "today" ? (
              <TasksView
                tasks={tasks}
                projects={projects}
                onToggle={async (task) => {
                  await updateTask(task, {
                    status: task.status === "done" ? "todo" : "done",
                  });
                }}
              />
            ) : null}
            {view === "projects" ? (
              <ProjectsView
                projects={projects}
                detail={projectDetail}
                selectedProjectId={selectedProjectId}
                onSelect={(projectId) => setSelectedProjectId(projectId)}
                onCreate={async (project) => {
                  const payload = await apiFetch<{ project: Project }>(
                    "/api/projects",
                    {
                      method: "POST",
                      body: JSON.stringify(project),
                    },
                  );
                  setNotice("Projet créé.");
                  await refreshData(true);
                  setSelectedProjectId(payload.project.id);
                }}
                onCapture={() => setView("capture")}
                onToggleTask={async (task) => {
                  await updateTask(task, {
                    status: task.status === "done" ? "todo" : "done",
                  });
                }}
              />
            ) : null}
            {view === "search" ? (
              <SearchView projects={projects} onOpenProject={setSelectedProjectId} />
            ) : null}
            {view === "settings" && settings ? (
              <SettingsView
                user={user}
                settings={settings}
                onUpdate={async (patch) => {
                  const payload = await apiFetch<{ settings: Settings }>(
                    "/api/settings",
                    {
                      method: "PATCH",
                      body: JSON.stringify(patch),
                    },
                  );
                  setSettings(payload.settings);
                  setNotice("Paramètres mis à jour.");
                }}
                onSignOut={handleSignedOut}
              />
            ) : null}
          </>
        )}
      </section>

      <MobileNav view={view} inboxCount={activeInboxCount} onViewChange={setView} />
    </main>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cx("brand-mark", compact && "compact")}>
      <span />
      <strong>Mantara</strong>
    </div>
  );
}

function Sidebar({
  user,
  view,
  inboxCount,
  onViewChange,
  onSignOut,
}: {
  user: SessionUser;
  view: ViewId;
  inboxCount: number;
  onViewChange: (view: ViewId) => void;
  onSignOut: () => void;
}) {
  return (
    <aside className="desktop-sidebar">
      <BrandMark />
      <button
        className="new-capture-button"
        type="button"
        onClick={() => onViewChange("capture")}
      >
        ◎ Nouvelle capture
      </button>
      <nav className="sidebar-nav" aria-label="Navigation principale">
        {VIEWS.filter((item) => item.id !== "capture").map((item) => (
          <button
            key={item.id}
            className={cx(view === item.id && "active")}
            type="button"
            onClick={() => onViewChange(item.id)}
          >
            <span>{item.icon}</span>
            {item.label}
            {item.id === "inbox" && inboxCount ? <em>{inboxCount}</em> : null}
          </button>
        ))}
      </nav>
      <button
        className="account-pill"
        type="button"
        onClick={() => onViewChange("settings")}
      >
        <span>{initials(user.name, user.email)}</span>
        <strong>{user.name?.split(" ")[0] ?? "Compte"}</strong>
        <small>⚙</small>
      </button>
      <button className="sidebar-signout" type="button" onClick={onSignOut}>
        Se déconnecter
      </button>
    </aside>
  );
}

function MobileNav({
  view,
  inboxCount,
  onViewChange,
}: {
  view: ViewId;
  inboxCount: number;
  onViewChange: (view: ViewId) => void;
}) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
      {VIEWS.filter((item) =>
        ["capture", "inbox", "today", "projects"].includes(item.id),
      ).map((item) => (
        <button
          key={item.id}
          className={cx(view === item.id && "active")}
          type="button"
          onClick={() => onViewChange(item.id)}
        >
          <span>{item.icon}</span>
          <strong>{item.short}</strong>
          {item.id === "inbox" && inboxCount ? <em>{inboxCount}</em> : null}
        </button>
      ))}
    </nav>
  );
}

function LoadingView() {
  return (
    <section className="loading-view">
      <div className="spinner" />
      <p>Analyse de l&apos;espace Mantara...</p>
    </section>
  );
}

function CaptureView({
  projects,
  onResult,
  onOpenInbox,
  onOpenProject,
}: {
  projects: Project[];
  onResult: (message: string) => Promise<void>;
  onOpenInbox: (captureId: string) => void;
  onOpenProject: (projectId: string) => void;
}) {
  const [text, setText] = useState(
    "Relancer le client X sur la validation du devis avant vendredi et voir si on ajuste le périmètre du site.",
  );
  const [recording, setRecording] = useState(false);
  const [writing, setWriting] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!recording) {
      return undefined;
    }
    const interval = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [recording]);

  async function submitText() {
    if (!text.trim()) {
      setError("La transcription est vide.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const payload = await apiFetch<CaptureResult>("/api/captures/text", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setResult(payload);
      await onResult(
        payload.auto_validated
          ? "Capture auto-validée par l'IA."
          : "Capture prête dans l'Inbox.",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Analyse impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function startRecording() {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void submitAudio(new Blob(chunksRef.current, { type: "audio/webm" }));
      };
      recorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setRecording(true);
    } catch {
      setError("Micro indisponible. Vous pouvez écrire à la place.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    setRecording(false);
    setSeconds(0);
  }

  function cancelRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    setRecording(false);
    setSeconds(0);
    chunksRef.current = [];
  }

  async function submitAudio(blob: Blob) {
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("audio", new File([blob], "capture.webm", { type: blob.type }));
      const payload = await apiFetch<CaptureResult>("/api/captures/audio", {
        method: "POST",
        body: formData,
      });
      setResult(payload);
      setText(payload.capture.raw_transcript ?? text);
      await onResult(
        payload.auto_validated
          ? "Capture vocale auto-validée par l'IA."
          : "Capture vocale prête dans l'Inbox.",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Transcription vocale impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  const matchedProjectId =
    result?.note.project_id ?? result?.analysis.project_match?.project_id;

  if (busy) {
    return (
      <section className="capture-screen processing">
        <div className="capture-processing-view">
          <div className="mobile-status-bar">
            <span>9:41</span>
            <span>● ● ●</span>
          </div>
          <div className="processing-content">
            <p className="eyebrow">Transcription</p>
            <div className="transcript-card">
              {text ||
                "Relancer le client X sur la validation du devis avant vendredi, et vérifier s'il faut ajuster le périmètre du site vitrine."}
            </div>
            <div className="processing-steps">
              <span className="done" />
              <strong>Voix transcrite</strong>
              <span className="active" />
              <strong>Analyse du contexte...</strong>
              <span />
              <strong>Classement par projet</strong>
              <span />
              <strong>Extraction des tâches</strong>
            </div>
          </div>
          <p className="processing-note">
            L&apos;IA structure votre note. Si elle est sûre, elle la classe directement
            — sinon elle la place dans l&apos;Inbox.
          </p>
        </div>
      </section>
    );
  }

  if (writing) {
    return (
      <section className="capture-screen writing">
        <div className="text-capture-view">
          <div className="text-capture-head">
            <button type="button" onClick={() => setWriting(false)}>
              ← Capture
            </button>
            <span className="eyebrow">Capture texte</span>
          </div>
          <div className="panel-heading">
            <p className="eyebrow">Capture texte</p>
            <h2>Dicter une pensée en moins de 10 secondes</h2>
          </div>
          <textarea
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Écrivez ou collez une transcription..."
          />
          {error ? <p className="form-error">{error}</p> : null}
          <button
            className="primary-button wide"
            type="button"
            disabled={busy}
            onClick={submitText}
          >
            Envoyer / analyser
          </button>

          {result ? (
            <div className="analysis-card">
              <div className="analysis-topline">
                <ConfidenceBadge value={result.note.confidence} />
                <span>{result.auto_validated ? "Auto-validée" : "À valider"}</span>
              </div>
              <h3>{result.note.title}</h3>
              <p>{result.note.body}</p>
              <div className="task-stack">
                {result.tasks.map((task) => (
                  <span key={task.id}>
                    <i /> {task.title}
                  </span>
                ))}
              </div>
              <div className="button-row">
                {result.note.status === "inbox" && result.capture.id ? (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => onOpenInbox(result.capture.id)}
                  >
                    Ouvrir dans l&apos;Inbox
                  </button>
                ) : null}
                {matchedProjectId ? (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => onOpenProject(matchedProjectId)}
                  >
                    Voir le projet
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="project-hints">
              <p className="eyebrow">Projets connus</p>
              {projects.slice(0, 3).map((project, index) => (
                <span key={project.id}>
                  <i
                    style={{
                      background: PROJECT_COLORS[index % PROJECT_COLORS.length],
                    }}
                  />
                  {project.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={cx("capture-screen", recording && "recording")}>
      <div className="capture-hero">
        <div className="recording-status-bar">
          <span>9:41</span>
          <span>● ● ●</span>
        </div>
        <div className="capture-state">
          {recording ? (
            <>
              <span className="live-dot" />
              <span>ENREGISTREMENT</span>
              <strong>{`00:${seconds.toString().padStart(2, "0")}`}</strong>
            </>
          ) : (
            <>
              <span>Prêt à enregistrer</span>
              <strong>Texte ou voix</strong>
            </>
          )}
        </div>

        <div className="capture-center">
          {recording ? (
            <>
              <Wave />
              <p>
                « Relancer le client X sur la validation du devis avant vendredi... »
              </p>
            </>
          ) : (
            <>
              <p>
                Appuyez et parlez.
                <br />
                On s&apos;occupe du classement.
              </p>
              <button className="mic-button" type="button" onClick={startRecording}>
                <span />
              </button>
              <button
                className="secondary-pill"
                type="button"
                onClick={() => setWriting(true)}
              >
                ✎ Écrire à la place
              </button>
            </>
          )}
        </div>

        {recording ? (
          <div className="record-actions">
            <button type="button" onClick={cancelRecording}>
              ✕
            </button>
            <button className="stop-button" type="button" onClick={stopRecording}>
              <span />
            </button>
          </div>
        ) : null}
      </div>

      {!recording ? (
        <aside className="capture-panel">
          <div className="panel-heading">
            <p className="eyebrow">Capture texte</p>
            <h2>Dicter une pensée en moins de 10 secondes</h2>
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Écrivez ou collez une transcription..."
          />
          {error ? <p className="form-error">{error}</p> : null}
          <button
            className="primary-button wide"
            type="button"
            disabled={busy}
            onClick={submitText}
          >
            {busy ? "Analyse en cours..." : "Envoyer / analyser"}
          </button>

          {result ? (
            <div className="analysis-card">
              <div className="analysis-topline">
                <ConfidenceBadge value={result.note.confidence} />
                <span>{result.auto_validated ? "Auto-validée" : "À valider"}</span>
              </div>
              <h3>{result.note.title}</h3>
              <p>{result.note.body}</p>
              <div className="task-stack">
                {result.tasks.map((task) => (
                  <span key={task.id}>
                    <i /> {task.title}
                  </span>
                ))}
              </div>
              <div className="button-row">
                {result.note.status === "inbox" && result.capture.id ? (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => onOpenInbox(result.capture.id)}
                  >
                    Ouvrir dans l&apos;Inbox
                  </button>
                ) : null}
                {matchedProjectId ? (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => onOpenProject(matchedProjectId)}
                  >
                    Voir le projet
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="project-hints">
              <p className="eyebrow">Projets connus</p>
              {projects.slice(0, 3).map((project, index) => (
                <span key={project.id}>
                  <i
                    style={{
                      background: PROJECT_COLORS[index % PROJECT_COLORS.length],
                    }}
                  />
                  {project.name}
                </span>
              ))}
            </div>
          )}
        </aside>
      ) : null}
    </section>
  );
}

function Wave() {
  return (
    <div className="wave" aria-hidden="true">
      {Array.from({ length: 30 }, (_, index) => (
        <span
          key={index}
          style={{
            height: `${16 + ((index * 53) % 40)}px`,
            animationDelay: `${(((index * 37) % 100) / 100) * 0.9}s`,
          }}
        />
      ))}
    </div>
  );
}

function InboxView({
  items,
  projects,
  bundle,
  selectedCaptureId,
  onSelect,
  onChanged,
}: {
  items: InboxItem[];
  projects: Project[];
  bundle: CaptureBundle | null;
  selectedCaptureId: string | null;
  onSelect: (captureId: string) => void;
  onChanged: (message: string) => Promise<void>;
}) {
  return (
    <section className="inbox-layout">
      <div className="list-column">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">À valider</p>
            <h2>Inbox</h2>
          </div>
          <span className="count-chip">{items.length}</span>
        </div>

        <div className="inbox-list">
          {items.length ? (
            items.map((item) => (
              <button
                key={item.note.id}
                className={cx(
                  "inbox-card",
                  selectedCaptureId === item.note.capture_id && "active",
                  confidenceKind(item.project_match.confidence),
                )}
                type="button"
                onClick={() => item.note.capture_id && onSelect(item.note.capture_id)}
              >
                <div className="card-topline">
                  <ConfidenceBadge value={item.project_match.confidence} />
                  <span>{item.task_count} tâches</span>
                </div>
                <h3>{item.note.title}</h3>
                <p>{item.excerpt}</p>
                <ProjectSuggestion item={item} />
                <div className="tag-row">
                  {item.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              </button>
            ))
          ) : (
            <EmptyState
              title="Inbox claire"
              body="Aucune capture ne demande validation."
            />
          )}
        </div>
      </div>

      <NoteDetailPanel
        key={bundle?.note?.id ?? "empty-detail"}
        projects={projects}
        bundle={bundle}
        onChanged={onChanged}
      />
    </section>
  );
}

function ProjectSuggestion({ item }: { item: InboxItem }) {
  const confidence = item.project_match.confidence;
  const uncertain = confidenceKind(confidence) !== "high";
  return (
    <div className={cx("project-suggestion", uncertain && "uncertain")}>
      <span>{uncertain ? "?" : "●"}</span>
      <strong>{item.project_match.project_name ?? "Projet à choisir"}</strong>
      <small>{formatConfidence(confidence)}</small>
    </div>
  );
}

function NoteDetailPanel({
  projects,
  bundle,
  onChanged,
}: {
  projects: Project[];
  bundle: CaptureBundle | null;
  onChanged: (message: string) => Promise<void>;
}) {
  const note = bundle?.note;
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [projectId, setProjectId] = useState<string | null>(note?.project_id ?? null);
  const [tags, setTags] = useState(note?.tags.join(", ") ?? "");
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>(
    bundle?.tasks.map(taskDraftFromTask) ?? [],
  );
  const [newProjectName, setNewProjectName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bundle || !note) {
    return (
      <aside className="detail-panel empty-detail">
        <EmptyState
          title="Sélectionnez une capture"
          body="La transcription brute, la note reformulée et les tâches apparaîtront ici."
        />
      </aside>
    );
  }

  async function save() {
    if (!note) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          body,
          project_id: projectId,
          tags: tags
            .split(",")
            .map((tag) => tag.trim().replace(/^#/, ""))
            .filter(Boolean),
          tasks: taskDrafts.filter((task) => task.title.trim()),
        }),
      });
      await onChanged("Capture modifiée.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Modification impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    if (!note) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/notes/${note.id}/accept`, {
        method: "POST",
        body: JSON.stringify({ project_id: projectId }),
      });
      await onChanged("Capture validée.");
    } catch (acceptError) {
      setError(
        acceptError instanceof Error ? acceptError.message : "Validation impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!note) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/notes/${note.id}/archive`, { method: "POST" });
      await onChanged("Capture archivée.");
    } catch (archiveError) {
      setError(
        archiveError instanceof Error ? archiveError.message : "Archivage impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createProject() {
    if (!newProjectName.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = await apiFetch<{ project: Project }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: newProjectName,
          type: "other",
          status: "active",
        }),
      });
      setProjectId(payload.project.id);
      setNewProjectName("");
      await onChanged("Projet créé depuis l'Inbox.");
    } catch (projectError) {
      setError(
        projectError instanceof Error ? projectError.message : "Création impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="detail-panel">
      <div className="detail-scroll">
        <div className="detail-topline">
          <span>Inbox / {projectName(projectId, projects)}</span>
          <ConfidenceBadge value={note.confidence} />
        </div>

        <label className="field">
          <span>Titre</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label className="field">
          <span>Projet proposé</span>
          <select
            value={projectId ?? ""}
            onChange={(event) => setProjectId(event.target.value || null)}
          >
            <option value="">Sans projet</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <div className="inline-project-form">
          <input
            value={newProjectName}
            onChange={(event) => setNewProjectName(event.target.value)}
            placeholder="Nouveau projet"
          />
          <button type="button" onClick={createProject} disabled={busy}>
            +
          </button>
        </div>

        <label className="field">
          <span>Note reformulée</span>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} />
        </label>

        <div className="raw-transcript">
          <p className="eyebrow">Transcription brute</p>
          <p>« {bundle.capture.raw_transcript ?? "Transcription indisponible"} »</p>
        </div>

        <label className="field">
          <span>Tags</span>
          <input value={tags} onChange={(event) => setTags(event.target.value)} />
        </label>

        <div className="tasks-editor">
          <div className="section-title-row compact">
            <p className="eyebrow">Tâches</p>
            <button
              className="text-button"
              type="button"
              onClick={() =>
                setTaskDrafts((current) => [
                  ...current,
                  {
                    title: "",
                    description: null,
                    status: "todo",
                    priority: "normal",
                    due_date: null,
                  },
                ])
              }
            >
              + Ajouter
            </button>
          </div>
          {taskDrafts.map((task, index) => (
            <div className="task-draft" key={`${task.title}-${index}`}>
              <input
                value={task.title}
                onChange={(event) =>
                  setTaskDrafts((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, title: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              <select
                value={task.priority}
                onChange={(event) =>
                  setTaskDrafts((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, priority: event.target.value as TaskPriority }
                        : item,
                    ),
                  )
                }
              >
                <option value="low">Basse</option>
                <option value="normal">Normale</option>
                <option value="high">Haute</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  setTaskDrafts((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {note.ai_summary ? (
          <div className="ai-reason">
            <p className="eyebrow">Pourquoi ce projet ?</p>
            <p>{note.ai_summary}</p>
          </div>
        ) : null}
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      <div className="detail-actions">
        <button
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={archive}
        >
          Archiver
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={save}
        >
          Enregistrer
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={busy}
          onClick={accept}
        >
          Valider
        </button>
      </div>
    </aside>
  );
}

function ProjectsView({
  projects,
  detail,
  selectedProjectId,
  onSelect,
  onCreate,
  onCapture,
  onToggleTask,
}: {
  projects: Project[];
  detail: ProjectDetail | null;
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  onCreate: (project: {
    name: string;
    type: string;
    status: string;
    client_name?: string | null;
  }) => Promise<void>;
  onCapture: () => void;
  onToggleTask: (task: Task) => Promise<void>;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }
    await onCreate({
      name,
      client_name: clientName.trim() || null,
      type: clientName.trim() ? "client_project" : "other",
      status: "active",
    });
    setName("");
    setClientName("");
    setCreating(false);
  }

  return (
    <section className="projects-layout">
      <div className="project-list-column">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Client, mission interne, opportunité</p>
            <h2>Projets</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={() => setCreating(true)}
          >
            +
          </button>
        </div>
        <div className="project-list">
          {projects.map((project, index) => (
            <button
              key={project.id}
              className={cx(
                "project-card",
                selectedProjectId === project.id && "active",
              )}
              type="button"
              onClick={() => onSelect(project.id)}
            >
              <div className="project-card-head">
                <span
                  style={{ background: PROJECT_COLORS[index % PROJECT_COLORS.length] }}
                />
                <strong>{project.name}</strong>
                <em className={project.status === "paused" ? "amber" : ""}>
                  {statusLabel(project.status)}
                </em>
              </div>
              <p>
                {project.open_task_count ?? 0} tâches ouvertes ·{" "}
                {project.note_count ?? 0} notes
              </p>
              <div className="progress-line">
                <span
                  style={{
                    width: `${Math.min(
                      88,
                      22 +
                        ((project.open_task_count ?? 1) + (project.note_count ?? 1)) *
                          8,
                    )}%`,
                    background: PROJECT_COLORS[index % PROJECT_COLORS.length],
                  }}
                />
              </div>
            </button>
          ))}
          {creating ? (
            <form className="new-project-card" onSubmit={submitProject}>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nom du projet"
              />
              <input
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="Client optionnel"
              />
              <div className="button-row">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setCreating(false)}
                >
                  Annuler
                </button>
                <button className="primary-button" type="submit">
                  Créer
                </button>
              </div>
            </form>
          ) : (
            <button
              className="new-project-card dashed"
              type="button"
              onClick={() => setCreating(true)}
            >
              + Nouveau projet
            </button>
          )}
        </div>
      </div>

      <div className="project-detail-column">
        {detail ? (
          <>
            <div className="project-detail-head">
              <div>
                <p className="eyebrow">
                  {statusLabel(detail.project.status)} · PROJET{" "}
                  {detail.project.type === "client_project" ? "CLIENT" : "INTERNE"}
                </p>
                <h2>{detail.project.name}</h2>
                <p>
                  {detail.project.client_name
                    ? `Client : ${detail.project.client_name} · `
                    : ""}
                  dernière activité {relativeDate(detail.project.last_activity_at)}
                </p>
              </div>
              <div className="metric-pair">
                <span>
                  <strong>
                    {detail.tasks.filter((task) => task.status !== "done").length}
                  </strong>
                  TÂCHES
                </span>
                <span>
                  <strong>{detail.notes.length}</strong>
                  NOTES
                </span>
              </div>
            </div>

            <div className="project-columns">
              <section>
                <div className="section-title-row compact">
                  <h3>Tâches ouvertes</h3>
                </div>
                <TaskList
                  tasks={detail.tasks}
                  projects={projects}
                  onToggle={onToggleTask}
                  hideProject
                />
              </section>
              <aside className="activity-panel">
                <p className="eyebrow">Activité</p>
                {detail.notes.slice(0, 4).map((note) => (
                  <div className="timeline-item" key={note.id}>
                    <span />
                    <p>
                      Note ajoutée ({note.accepted_by === "ai" ? "voix" : "texte"}) ·{" "}
                      {relativeDate(note.created_at)}
                    </p>
                  </div>
                ))}
                {detail.captures.slice(0, 3).map((capture) => (
                  <div className="timeline-item" key={capture.id}>
                    <span />
                    <p>Capture liée · {relativeDate(capture.created_at)}</p>
                  </div>
                ))}
              </aside>
            </div>

            <section className="notes-strip">
              <div className="section-title-row compact">
                <h3>Notes récentes</h3>
                <button className="primary-button" type="button" onClick={onCapture}>
                  ◎ Capturer pour ce projet
                </button>
              </div>
              <div className="note-grid">
                {detail.notes.slice(0, 3).map((note) => (
                  <article key={note.id}>
                    <p className="eyebrow">{relativeDate(note.created_at)} · texte</p>
                    <h4>{note.title}</h4>
                    <p>{note.body}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : (
          <EmptyState
            title="Choisissez un projet"
            body="Les tâches, notes et captures liées s'afficheront ici."
          />
        )}
      </div>
    </section>
  );
}

function TasksView({
  tasks,
  projects,
  onToggle,
}: {
  tasks: Task[];
  projects: Project[];
  onToggle: (task: Task) => Promise<void>;
}) {
  const [tab, setTab] = useState<"today" | "week" | "project">("today");
  const openTasks = tasks.filter((task) => task.status !== "done");
  const doneTasks = tasks.filter((task) => task.status === "done");
  const grouped = useMemo(() => {
    return projects.map((project) => ({
      project,
      tasks: openTasks.filter((task) => task.project_id === project.id),
    }));
  }, [openTasks, projects]);

  return (
    <section className="tasks-screen">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Savoir quoi faire</p>
          <h2>Aujourd&apos;hui</h2>
          <p className="muted-line">
            {openTasks.length} tâches · pas de retard. Respirez.
          </p>
        </div>
      </div>
      <div className="tabs">
        <button
          className={cx(tab === "today" && "active")}
          type="button"
          onClick={() => setTab("today")}
        >
          À faire
        </button>
        <button
          className={cx(tab === "week" && "active")}
          type="button"
          onClick={() => setTab("week")}
        >
          Cette semaine
        </button>
        <button
          className={cx(tab === "project" && "active")}
          type="button"
          onClick={() => setTab("project")}
        >
          Par projet
        </button>
      </div>

      {tab === "project" ? (
        <div className="task-groups">
          {grouped
            .filter((group) => group.tasks.length)
            .map((group) => (
              <section key={group.project.id}>
                <div className="task-group-head">
                  <span
                    style={{
                      background: projectColor(group.project.id, projects),
                    }}
                  />
                  <strong>{group.project.name}</strong>
                  <em>{group.tasks.length}</em>
                </div>
                <TaskList
                  tasks={group.tasks}
                  projects={projects}
                  onToggle={onToggle}
                  hideProject
                />
              </section>
            ))}
        </div>
      ) : (
        <TaskList tasks={openTasks} projects={projects} onToggle={onToggle} />
      )}

      <section className="done-section">
        <p className="eyebrow">Terminées · {doneTasks.length}</p>
        <TaskList
          tasks={doneTasks.slice(0, 5)}
          projects={projects}
          onToggle={onToggle}
          compact
        />
      </section>
    </section>
  );
}

function TaskList({
  tasks,
  projects,
  onToggle,
  compact = false,
  hideProject = false,
}: {
  tasks: Task[];
  projects: Project[];
  onToggle: (task: Task) => Promise<void>;
  compact?: boolean;
  hideProject?: boolean;
}) {
  if (!tasks.length) {
    return (
      <EmptyState
        title="Rien à afficher"
        body="Les prochaines actions apparaîtront ici."
        compact
      />
    );
  }

  return (
    <div className={cx("task-list", compact && "compact")}>
      {tasks.map((task) => (
        <button
          key={task.id}
          className={cx("task-row", task.status === "done" && "done")}
          type="button"
          onClick={() => onToggle(task)}
        >
          <span className="task-check">{task.status === "done" ? "✓" : ""}</span>
          <span className="task-main">
            <strong>{task.title}</strong>
            {!hideProject ? (
              <small>
                <i style={{ background: projectColor(task.project_id, projects) }} />
                {projectName(task.project_id, projects)}
              </small>
            ) : null}
          </span>
          {task.due_date ? <em>échéance {dueLabel(task.due_date)}</em> : null}
          <b className={task.priority === "high" ? "high" : ""}>
            {priorityLabel(task.priority)}
          </b>
        </button>
      ))}
    </div>
  );
}

function SearchView({
  projects,
  onOpenProject,
}: {
  projects: Project[];
  onOpenProject: (projectId: string) => void;
}) {
  const [query, setQuery] = useState("devis");
  const [filter, setFilter] = useState<"all" | SearchResult["type"]>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      return undefined;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await apiFetch<{ query: string; results: SearchResult[] }>(
          `/api/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        setResults(payload.results);
      } catch (searchError) {
        if (!controller.signal.aborted) {
          setError(
            searchError instanceof Error
              ? searchError.message
              : "Recherche impossible.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  const visibleResults = results.filter(
    (result) => filter === "all" || result.type === filter,
  );
  const counts = {
    all: results.length,
    note: results.filter((result) => result.type === "note").length,
    task: results.filter((result) => result.type === "task").length,
    project: results.filter((result) => result.type === "project").length,
  };

  return (
    <section className="search-screen">
      <div className="search-palette">
        <label className="search-box">
          <span>⌕</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              if (!nextQuery.trim()) {
                setResults([]);
              }
            }}
            placeholder="Rechercher notes, tâches, projets..."
          />
          <kbd>esc</kbd>
        </label>
        <div className="tabs">
          <button
            className={cx(filter === "all" && "active")}
            type="button"
            onClick={() => setFilter("all")}
          >
            Tout · {counts.all}
          </button>
          <button
            className={cx(filter === "note" && "active")}
            type="button"
            onClick={() => setFilter("note")}
          >
            Notes
          </button>
          <button
            className={cx(filter === "task" && "active")}
            type="button"
            onClick={() => setFilter("task")}
          >
            Tâches
          </button>
          <button
            className={cx(filter === "project" && "active")}
            type="button"
            onClick={() => setFilter("project")}
          >
            Projets
          </button>
        </div>
        {loading ? <p className="muted-line">Recherche...</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        <div className="search-results">
          {visibleResults.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              className="search-result"
              type="button"
              onClick={() => {
                if (result.type === "project") {
                  onOpenProject(result.id);
                } else if (result.project_id) {
                  onOpenProject(result.project_id);
                }
              }}
            >
              <span className={cx("result-badge", result.type)}>
                {typeLabel(result.type)}
              </span>
              <span>
                <strong>{highlight(result.title, query)}</strong>
                <small>
                  {result.project_name ?? projectName(result.project_id, projects)}
                  {result.snippet
                    ? ` · ${result.type === "note" ? "transcription : " : ""}`
                    : ""}
                  {highlight(result.snippet, query)}
                </small>
              </span>
            </button>
          ))}
          {!visibleResults.length && !loading ? (
            <EmptyState
              title="Aucun résultat"
              body="La recherche inclut aussi la transcription brute."
              compact
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function typeLabel(type: SearchResult["type"]) {
  const labels: Record<SearchResult["type"], string> = {
    task: "TÂCHE",
    note: "NOTE",
    project: "PROJET",
  };
  return labels[type];
}

function SettingsView({
  user,
  settings,
  onUpdate,
  onSignOut,
}: {
  user: SessionUser;
  settings: Settings;
  onUpdate: (patch: Partial<Settings>) => Promise<void>;
  onSignOut: () => void;
}) {
  return (
    <section className="settings-screen">
      <div>
        <p className="eyebrow">Ajuster le niveau de contrôle sur l&apos;IA</p>
        <h2>Paramètres</h2>
      </div>
      <div className="settings-grid">
        <section>
          <p className="eyebrow">Validation par l&apos;IA</p>
          <SettingToggle
            title="Auto-validation forte confiance"
            body="Classe seule les captures sûres"
            checked={settings.auto_validate_high_confidence}
            onChange={(checked) => onUpdate({ auto_validate_high_confidence: checked })}
          />
          <SettingToggle
            title="Tout passe par l'Inbox"
            body="Validation manuelle systématique"
            checked={settings.manual_review_all_captures}
            onChange={(checked) => onUpdate({ manual_review_all_captures: checked })}
          />
          <div className="priority-setting">
            <h3>Priorité par défaut des tâches</h3>
            <div className="segments">
              {(["low", "normal", "high"] as TaskPriority[]).map((priority) => (
                <button
                  key={priority}
                  className={
                    settings.default_task_priority === priority ? "active" : ""
                  }
                  type="button"
                  onClick={() => onUpdate({ default_task_priority: priority })}
                >
                  {priorityText(priority)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="account-card">
          <p className="eyebrow">Compte</p>
          <div className="account-row">
            <span>{initials(user.name, user.email)}</span>
            <div>
              <strong>{user.name ?? "Jean Mercier"}</strong>
              <small>{user.email ?? "jean@mantara.co"}</small>
            </div>
          </div>
          <button type="button">Changer le mot de passe</button>
          <button className="danger-link" type="button" onClick={onSignOut}>
            Se déconnecter
          </button>
        </aside>
      </div>
    </section>
  );
}

function SettingToggle({
  title,
  body,
  checked,
  onChange,
}: {
  title: string;
  body: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button className="setting-toggle" type="button" onClick={() => onChange(!checked)}>
      <span>
        <strong>{title}</strong>
        <small>{body}</small>
      </span>
      <i className={checked ? "on" : ""} />
    </button>
  );
}

function ConfidenceBadge({ value }: { value: number | null | undefined }) {
  return (
    <span className={cx("confidence-badge", confidenceKind(value))}>
      {confidenceLabel(value)} · {formatConfidence(value)}
    </span>
  );
}

function EmptyState({
  title,
  body,
  compact = false,
}: {
  title: string;
  body: string;
  compact?: boolean;
}) {
  return (
    <div className={cx("empty-state", compact && "compact")}>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
