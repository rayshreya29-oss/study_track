# StudySync

A personal study planner — subjects → modules → topics, with progress tracking.
The UI is a dependency-free static front end backed by a small Node server that
stores everything in a **local SQLite database** (Node's built-in `node:sqlite`,
so there is nothing to compile).

## Run it

```bash
npm start          # http://localhost:3000
npm run dev        # auto-restarting development server
```

Requires Node.js 22.5+ (26.x recommended). No `npm install` needed.

## Database & migration

- The database lives at `data/studysync.db` and is created automatically.
- Schema: `db/schema.sql` (subjects → modules → topics, with cascading deletes).
- Initialize / import:

```bash
npm run migrate                      # create schema, show row counts
npm run migrate -- ./legacy.json     # also import an exported dataset
```

`legacy.json` can be the raw array previously stored in browser `localStorage`
under `studySyncSubjects`, or an object containing that key.

When you open the app, any existing `localStorage` data is **migrated into
SQLite automatically** on first load (and the old key is removed).

If the server is unavailable, the app falls back to `localStorage` so you never
lose changes.

## API

| Method | Endpoint     | Description                          |
| ------ | ------------ | ------------------------------------ |
| GET    | `/api/health`| Health check                         |
| GET    | `/api/state` | Read all subjects/modules/topics     |
| PUT    | `/api/state` | Replace state `{ "subjects": [...] }`|

## Installed tooling

- `opencode-skill-finder` — OpenCode plugin for discovering agent skills (installed globally).
- `taste-skill` — design guidance in `skills/taste/` and prompt templates in `templates/taste/`.
