-- Migration 0001 — schema initial (SPEC_DESIGN.md section 8).
--
-- Couvre toutes les entites du MVP : users (gere par Auth.js en phase 2, avec
-- mot de passe hache), user_settings, projects, captures, notes, tasks, tags,
-- note_tags. Chaque table metier porte un `user_id` : tout l'acces applicatif
-- est scope par utilisateur (section 9.4). ON DELETE CASCADE depuis users pour
-- qu'un compte supprime emporte toutes ses donnees.
--
-- Convention : identifiants UUID (section 9.5), dates en timestamptz (UTC),
-- `updated_at` maintenu par trigger. Ce fichier est execute en une transaction
-- par le runner (scripts/migrate.mjs) — pas de BEGIN/COMMIT ici.

-- gen_random_uuid() est natif depuis PG13 ; l'extension est un filet de securite.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fonction partagee pour maintenir updated_at a chaque UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Enums (domaines fermes de la section 8 + statuts de traitement de la 9.5).
-- ---------------------------------------------------------------------------
CREATE TYPE project_type AS ENUM (
  'client_project', 'internal', 'opportunity', 'technical', 'personal', 'other'
);
CREATE TYPE project_status AS ENUM ('active', 'paused', 'archived', 'completed');
CREATE TYPE capture_input_type AS ENUM ('voice', 'text');
CREATE TYPE capture_processing_status AS ENUM (
  'pending', 'transcribing', 'analyzing', 'analyzed', 'error'
);
CREATE TYPE note_status AS ENUM ('inbox', 'accepted', 'archived');
CREATE TYPE note_accepted_by AS ENUM ('user', 'ai');
CREATE TYPE task_status AS ENUM ('todo', 'doing', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high');

-- ---------------------------------------------------------------------------
-- users — compte utilisateur. En phase 2, Auth.js (credentials) s'appuie sur
-- cette table ; `password_hash` stocke le bcrypt du mot de passe.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL,
  name              text,
  password_hash     text,
  email_verified_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
-- Unicite d'e-mail insensible a la casse.
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));

-- ---------------------------------------------------------------------------
-- user_settings — preferences (1 ligne par utilisateur). Defauts alignes sur
-- les sections 7.6 / 9.5 / 10.4.10.
-- ---------------------------------------------------------------------------
CREATE TABLE user_settings (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  auto_validate_high_confidence boolean NOT NULL DEFAULT true,
  manual_review_all_captures    boolean NOT NULL DEFAULT false,
  default_task_priority         task_priority NOT NULL DEFAULT 'normal',
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER user_settings_set_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- projects — unite principale d'organisation (section 8 / decisions 1.1).
-- ---------------------------------------------------------------------------
CREATE TABLE projects (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             text NOT NULL,
  type             project_type NOT NULL DEFAULT 'other',
  client_name      text,
  description      text,
  status           project_status NOT NULL DEFAULT 'active',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_user_idx ON projects (user_id);
CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- captures — entree brute (voix ou texte). Regle produit : une capture est
-- TOUJOURS persistee, meme si transcription/analyse echoue (section 9.5).
-- Pas de conservation audio dans le MVP (decision 1.1).
-- ---------------------------------------------------------------------------
CREATE TABLE captures (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input_type        capture_input_type NOT NULL,
  raw_transcript    text,
  processing_status capture_processing_status NOT NULL DEFAULT 'pending',
  created_at        timestamptz NOT NULL DEFAULT now(),
  processed_at      timestamptz
);
CREATE INDEX captures_user_idx ON captures (user_id);

-- ---------------------------------------------------------------------------
-- notes — version propre de la capture. `project_id` optionnel (Inbox sans
-- projet). Une note inbox n'a pas d'`accepted_by` (section 7.6).
-- ---------------------------------------------------------------------------
CREATE TABLE notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id  uuid REFERENCES projects(id) ON DELETE SET NULL,
  capture_id  uuid REFERENCES captures(id) ON DELETE CASCADE,
  title       text NOT NULL,
  body        text NOT NULL DEFAULT '',
  ai_summary  text,
  status      note_status NOT NULL DEFAULT 'inbox',
  accepted_by note_accepted_by,
  confidence  real,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- confidence est un score 0..1 (section 7.6).
  CONSTRAINT notes_confidence_range CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  -- une note encore dans l'Inbox n'a pas ete acceptee.
  CONSTRAINT notes_inbox_not_accepted CHECK (status <> 'inbox' OR accepted_by IS NULL)
);
CREATE INDEX notes_user_idx ON notes (user_id);
CREATE INDEX notes_project_idx ON notes (project_id);
CREATE INDEX notes_capture_idx ON notes (capture_id);
CREATE INDEX notes_user_status_idx ON notes (user_id, status);
CREATE TRIGGER notes_set_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- tasks — action extraite ou creee manuellement. Les liens note/capture
-- passent en NULL si la source est supprimee (on garde la tache), sauf le
-- compte proprietaire (CASCADE).
-- ---------------------------------------------------------------------------
CREATE TABLE tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id   uuid REFERENCES projects(id) ON DELETE SET NULL,
  note_id      uuid REFERENCES notes(id) ON DELETE SET NULL,
  capture_id   uuid REFERENCES captures(id) ON DELETE SET NULL,
  title        text NOT NULL,
  description  text,
  status       task_status NOT NULL DEFAULT 'todo',
  priority     task_priority NOT NULL DEFAULT 'normal',
  due_date     date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX tasks_user_idx ON tasks (user_id);
CREATE INDEX tasks_project_idx ON tasks (project_id);
CREATE INDEX tasks_note_idx ON tasks (note_id);
CREATE INDEX tasks_user_status_idx ON tasks (user_id, status);
CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- tags + note_tags — themes reutilisables et leur liaison N-N avec les notes.
-- ---------------------------------------------------------------------------
CREATE TABLE tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  color      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Un tag est unique par utilisateur (insensible a la casse).
CREATE UNIQUE INDEX tags_user_name_idx ON tags (user_id, lower(name));

CREATE TABLE note_tags (
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);
CREATE INDEX note_tags_tag_idx ON note_tags (tag_id);
