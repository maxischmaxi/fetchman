# Fetchman

Eine selbstgehostete Postman-Alternative für API-Entwicklung und Testing. Gebaut mit Next.js 15, React 19, MongoDB und shadcn/ui.

## Features

- **MongoDB Integration**: Alle Collections und Requests werden sicher in MongoDB gespeichert
- **Selbst gehostet**: Volle Kontrolle über deine Daten
- **Modern Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Dark Mode**: Vollständige Theme-Unterstützung mit System-Synchronisation
- **Docker Support**: Einfaches Deployment mit Docker Compose

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
- **UI**: React 19, shadcn/ui, Tailwind CSS
- **Database**: MongoDB mit Mongoose ODM
- **Containerization**: Docker & Docker Compose
- **Theme**: next-themes mit Dark Mode Support

## Entwicklung

### Projekt-Struktur

```
fetchman/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── globals.css        # Globale Styles mit Theme-Variablen
│   └── layout.tsx         # Root Layout
├── components/            # React Komponenten
│   ├── ui/               # shadcn/ui Komponenten
│   ├── providers/        # Theme Provider
│   ├── navigation.tsx    # Hauptnavigation
│   └── theme-toggle.tsx  # Theme Switcher
├── lib/                   # Utilities und Helpers
│   ├── db/               # Datenbankverbindungen
│   └── models/           # Mongoose Models
└── docker-compose.yml     # Docker Services
```

### MongoDB Models

#### Collection
Speichert API-Collections mit mehreren Requests:
- Name
- Beschreibung
- Requests Array (Name, Method, URL, Headers, Body)

#### Environment
Speichert Environment-Variablen:
- Name
- Variables (Key-Value Paare)
- Beschreibung

## Kommende Features

- [ ] Request Builder UI
- [ ] Collection Management
- [ ] Environment Variables
- [ ] Request History
- [ ] Response Viewer
- [ ] Authentication Support (OAuth, JWT, etc.)
- [ ] Import/Export Collections
- [ ] Websocket Testing
- [ ] GraphQL Support

## Lizenz

MIT
