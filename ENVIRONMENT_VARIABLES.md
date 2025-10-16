# Environment Variables mit Variable-Substitution

Dieses Feature ermöglicht es, Umgebungsvariablen in HTTP-Requests zu verwenden, die automatisch zur Laufzeit ersetzt werden.

## Funktionen

### Variable-Substitution Syntax

Verwenden Sie die Syntax `{{variable_name}}` in Ihren Requests. Diese Platzhalter werden automatisch durch die entsprechenden Werte aus den Workspace-Umgebungsvariablen ersetzt.

**Unterstützte Stellen:**
- URL (Path und Query-String)
- Headers (Keys und Values)
- Request Body
- Auth-Felder (Token, Passwort, API Key)

### Beispiele

#### URL-Substitution
```
{{base_url}}/api/{{version}}/users
```
Mit den Variablen:
- `base_url` = `https://api.example.com`
- `version` = `v2`

Wird zu:
```
https://api.example.com/api/v2/users
```

#### Header-Substitution
```
Authorization: Bearer {{api_token}}
X-Custom-Header: {{custom_value}}
```

#### Body-Substitution (JSON)
```json
{
  "apiKey": "{{api_key}}",
  "endpoint": "{{base_url}}/webhook"
}
```

## Technische Details

### Architektur

1. **Variablen-Speicherung** (`/lib/models/WorkspaceEnvironment.ts`)
   - Variablen werden workspace-bezogen in MongoDB gespeichert
   - Alle Werte werden mit AES-256-GCM verschlüsselt
   - Unterstützung für Secret-Variablen (maskiert in der UI)

2. **Substitution-Engine** (`/lib/templating/substitution.ts`)
   - `getVariableMap(workspaceId)` - Lädt und entschlüsselt alle Variablen
   - `substituteVariablesInString()` - Ersetzt Variablen in Strings
   - `substituteInObject()` - Ersetzt Variablen in Objekten (rekursiv)
   - `substituteRequest()` - Hauptfunktion für Request-Substitution

3. **Request-Execution** (`/app/api/execute/route.ts`)
   - Substitution erfolgt serverseitig vor der HTTP-Anfrage
   - Variablen werden niemals an den Client gesendet
   - Fehlerbehandlung: Bei fehlender Variable bleibt der Platzhalter erhalten

### Regex-Pattern

```javascript
/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g
```

- Erlaubt optionale Whitespaces: `{{ variable }}` oder `{{variable}}`
- Variablennamen: Beginnen mit Buchstabe oder Unterstrich, gefolgt von alphanumerischen Zeichen oder Unterstrichen

### Sicherheit

- **Verschlüsselung**: AES-256-GCM für alle Variablenwerte
- **Server-seitig**: Variablen werden nur serverseitig entschlüsselt und substituiert
- **Keine Exposition**: Variablenwerte werden niemals an den Client übertragen
- **Secret-Masking**: Secret-Variablen werden in der UI als Passwortfelder angezeigt

### Fehlerbehandlung

1. **Variable nicht gefunden**: Platzhalter bleibt unverändert + Warnung im Server-Log
2. **Entschlüsselung fehlgeschlagen**: Variable wird übersprungen + Fehler im Log
3. **Keine Variablen definiert**: Request wird unverändert ausgeführt
4. **Substitution schlägt fehl**: Request verwendet Originalwerte

## Verwendung

### 1. Variablen verwalten

1. Öffnen Sie ein Workspace
2. Klicken Sie auf den "Environment" Tab in der Sidebar
3. Fügen Sie Variablen hinzu mit Key-Value-Paaren
4. Markieren Sie sensible Werte als "Secret"

### 2. Variablen in Requests verwenden

Verwenden Sie die `{{variable_name}}` Syntax in:
- URL-Feld
- Headers-Tabelle
- Body-Editor
- Auth-Feldern

### 3. Request ausführen

Beim Klick auf "Send":
1. Request wird mit `workspaceId` an die API gesendet
2. Server lädt und entschlüsselt Workspace-Variablen
3. Alle `{{variablen}}` werden ersetzt
4. HTTP-Request wird mit substituierten Werten ausgeführt

## API

### GET/PUT `/api/workspaces/[id]/env`

Verwaltet Umgebungsvariablen für einen Workspace.

**Response:**
```json
{
  "workspaceId": "...",
  "variables": [
    {
      "key": "base_url",
      "value": "encrypted:...",
      "isSecret": false
    },
    {
      "key": "api_token",
      "value": "encrypted:...",
      "isSecret": true
    }
  ]
}
```

### POST `/api/execute`

Führt HTTP-Request mit Variable-Substitution aus.

**Request Body:**
```json
{
  "method": "GET",
  "url": "{{base_url}}/api/users",
  "headers": {
    "Authorization": "Bearer {{token}}"
  },
  "body": "...",
  "workspaceId": "..."
}
```

## Erweiterungsmöglichkeiten

### Geplante Features

1. **Globale Variablen**: Workspace-übergreifende Variablen
2. **Environment-Profile**: Mehrere Sets (Dev, Staging, Production)
3. **Verschachtelte Substitution**: `{{base_{{env}}_url}}`
4. **Default-Werte**: `{{variable:default_value}}`
5. **Umgebungsvariablen-Import**: Aus .env-Dateien
6. **Variable-Autocomplete**: Im Request-Editor
7. **Variable-Validierung**: Warnung bei undefinierten Variablen

### Code-Erweiterung

```typescript
// Neue Substitution-Funktionen in lib/templating/substitution.ts

export function hasVariables(text: string): boolean {
  // Prüft, ob Text Variablen enthält
}

export function extractVariableNames(text: string): string[] {
  // Extrahiert alle Variablennamen aus einem Text
}
```

## Troubleshooting

### Variable wird nicht ersetzt

1. Prüfen Sie die Schreibweise: `{{variable_name}}`
2. Stellen Sie sicher, dass die Variable im Workspace definiert ist
3. Überprüfen Sie Server-Logs auf Entschlüsselungsfehler

### Verschlüsselung schlägt fehl

1. Überprüfen Sie, ob `ENCRYPTION_KEY` in `.env` gesetzt ist
2. Key muss mindestens 32 Zeichen lang sein
3. Nach Änderung des Keys müssen Variablen neu gespeichert werden

### Performance

- Variablen werden pro Request einmal geladen
- Entschlüsselung erfolgt in-memory
- Substitution ist O(n) bezüglich Textlänge
- Caching: Keine persistente Caching-Schicht (wird bei jedem Request neu geladen)

## Migration

Bestehende Requests funktionieren weiterhin ohne Änderungen. Um Variable-Substitution zu nutzen:

1. Erstellen Sie Umgebungsvariablen im Workspace
2. Ersetzen Sie Hardcoded-Werte durch `{{variablen}}`
3. Speichern und testen Sie den Request

Kein Breaking Change - Feature ist vollständig rückwärtskompatibel.
