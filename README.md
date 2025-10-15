# Fetchman

Eine selbstgehostete Postman-Alternative für API-Entwicklung und Testing. Gebaut mit Next.js 15, React 19, MongoDB und shadcn/ui.

## Features

- **Workspace Management**: Organisiere deine API-Requests in Workspaces und Ordnern
- **Request Builder**: Vollständiger HTTP-Client mit Unterstützung für alle gängigen Methoden
- **MongoDB Integration**: Alle Workspaces, Ordner und Requests werden sicher in MongoDB gespeichert
- **TypeScript**: Vollständig typisiert mit strikter Type-Safety zwischen Frontend und Backend
- **Modern Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Dark Mode**: Vollständige Theme-Unterstützung mit System-Synchronisation
- **Docker Support**: Einfaches Deployment mit Docker Compose
- **Code Editor**: Monaco Editor für JSON/XML Body-Editing mit Syntax-Highlighting

## Voraussetzungen

- Node.js 20 oder höher
- Docker und Docker Compose (für Container-Deployment)
- npm oder yarn

## Installation & Entwicklung

### Lokale Entwicklung

1. Repository klonen:
```bash
git clone <repository-url>
cd fetchman
```

2. Dependencies installieren:
```bash
npm install
```

3. MongoDB mit Docker starten:
```bash
docker compose up mongodb mongo-express -d
```

4. Entwicklungsserver starten:
```bash
npm run dev
```

Die App ist nun verfügbar unter `http://localhost:3000`

Mongo Express (MongoDB Web UI) ist verfügbar unter `http://localhost:8081`

### Mit Docker Compose

Die gesamte Anwendung inklusive MongoDB und Mongo Express starten:

```bash
docker compose up -d
```

Services:
- **Next.js App**: http://localhost:3000
- **MongoDB**: localhost:27017
- **Mongo Express**: http://localhost:8081

## Umgebungsvariablen

Erstelle eine `.env.local` Datei im Root-Verzeichnis:

```env
MONGODB_URI=mongodb://admin:admin123@localhost:27017/fetchman?authSource=admin
ENCRYPTION_KEY=your-32-char-encryption-key
```

**Hinweis**: Die Standard-Credentials sind `admin:admin123`. Ändere diese in der `docker-compose.yml` für Produktionsumgebungen!

## API Endpoints

### Health Check
```
GET /api/health
```
Testet die Verbindung zur MongoDB.

## Technologie-Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript mit strikter Type-Safety
- **UI**: React 19, shadcn/ui, Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Database**: MongoDB mit Mongoose ODM
- **Code Editor**: Monaco Editor (@monaco-editor/react)
- **Containerization**: Docker & Docker Compose
- **Theme**: next-themes mit Dark Mode Support

## Entwicklung

### Projekt-Struktur

```
fetchman/
├── app/                      # Next.js App Router
│   ├── api/                 # API Routes (REST endpoints)
│   │   ├── workspaces/     # Workspace CRUD
│   │   ├── folders/        # Folder CRUD
│   │   └── requests/       # Request CRUD
│   ├── [[...slug]]/        # Dynamic routing für Workspaces
│   ├── globals.css         # Globale Styles mit Theme-Variablen
│   └── layout.tsx          # Root Layout mit Providers
├── components/              # React Komponenten
│   ├── ui/                 # shadcn/ui Komponenten
│   ├── workspace/          # Workspace-spezifische Komponenten
│   │   ├── workspace-sidebar.tsx
│   │   ├── workspace-tree.tsx
│   │   ├── request-builder.tsx
│   │   └── folder-overview.tsx
│   └── providers/          # React Context Providers
├── lib/                     # Utilities und Helpers
│   ├── db/                 # Datenbankverbindungen
│   ├── models/             # Mongoose Models
│   │   ├── Workspace.ts
│   │   ├── Folder.ts
│   │   └── Request.ts
│   ├── types/              # Shared TypeScript Types
│   │   └── index.ts        # Zentrale Type-Definitionen
│   └── utils.ts            # Utility-Funktionen
└── docker-compose.yml       # Docker Services
```

### MongoDB Models

#### Workspace
Organisationseinheit für API-Requests:
- Name
- Beschreibung (optional)
- Timestamps

#### Folder
Hierarchische Ordnerstruktur innerhalb von Workspaces:
- Name
- Workspace-Referenz
- Parent Folder (optional für Verschachtelung)
- Timestamps

#### Request
HTTP-Request-Konfiguration:
- Name, Method, URL
- Workspace- und Folder-Referenzen
- Headers (Key-Value mit Enable/Disable)
- Query Parameters (Key-Value mit Enable/Disable)
- Body (Text/JSON/XML)
- Authentication (None, Bearer, Basic, API-Key, OAuth2)
- Timestamps

## Implementierte Features

- [x] Workspace Management (Erstellen, Löschen, Navigieren)
- [x] Folder Management mit hierarchischer Struktur
- [x] Request Builder mit vollem HTTP-Support
- [x] HTTP Methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- [x] Header Management mit Enable/Disable Toggle
- [x] Query Parameter Management
- [x] Body Editor (JSON, XML, Text) mit Monaco Editor
- [x] Authentication Support (Bearer, Basic, API-Key, OAuth2)
- [x] Response Viewer mit Syntax-Highlighting
- [x] Dark Mode Support
- [x] TypeScript Type-Safety

## Kommende Features

- [ ] Environment Variables mit Variable-Substitution
- [ ] Request History
- [ ] Import/Export (Postman/Insomnia Format)
- [ ] Websocket Testing
- [ ] GraphQL Support
- [ ] Pre-request Scripts
- [ ] Test Scripts
- [ ] Collections Sharing/Collaboration

## Lizenz

MIT
