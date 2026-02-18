# TFSReporter — TECHNICAL PLAN
## Architecture & Roadmap de développement

---

## 1. ARCHITECTURE GLOBALE

```
TFSReporter/
├── src/
│   ├── main/                    # Processus principal Electron
│   │   ├── index.js             # Entry point Electron
│   │   ├── ipcHandlers/         # Handlers IPC (main ↔ renderer)
│   │   │   ├── auth.handler.js
│   │   │   ├── ado.handler.js
│   │   │   ├── export.handler.js
│   │   │   └── schedule.handler.js
│   │   ├── services/            # Services métier (main process)
│   │   │   ├── AdoService.js    # API Azure DevOps
│   │   │   ├── AuthService.js   # Chiffrement PAT
│   │   │   ├── PdfService.js    # Génération PDF (PDFKit)
│   │   │   ├── ExcelService.js  # Génération Excel (ExcelJS)
│   │   │   ├── PptxService.js   # Génération PPTX (PptxGenJS)
│   │   │   ├── HtmlService.js   # Génération HTML
│   │   │   ├── EmailService.js  # Envoi email (Nodemailer)
│   │   │   └── ScheduleService.js # Tâches planifiées
│   │   └── store/
│   │       └── store.js         # electron-store (persistance)
│   │
│   └── renderer/                # Processus renderer (React)
│       ├── index.html
│       ├── index.jsx
│       ├── App.jsx
│       ├── components/          # Composants réutilisables
│       │   ├── Layout/
│       │   ├── ConnectionForm/
│       │   ├── TestPlanSelector/
│       │   ├── MetadataForm/
│       │   ├── ReportPreview/
│       │   ├── Charts/
│       │   └── ExportPanel/
│       ├── pages/               # Écrans principaux
│       │   ├── ConnectionPage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── ReportBuilderPage.jsx
│       │   ├── ComparisonPage.jsx
│       │   └── SettingsPage.jsx
│       ├── store/               # Zustand stores
│       │   ├── authStore.js
│       │   ├── adoStore.js
│       │   └── reportStore.js
│       └── api/                 # Bridge IPC renderer
│           └── ipcApi.js
│
├── electron-builder.config.js   # Config packaging .exe
├── vite.config.js               # Config Vite (bundler)
├── package.json
└── forge.config.js              # Electron Forge
```

---

## 2. FLUX DE DONNÉES

```
React UI
   │ (ipcRenderer.invoke)
   ▼
IPC Bridge
   │
   ▼
Main Process (Electron)
   │
   ├──► AdoService ──► Azure DevOps API (REST)
   │         │
   │         └──► Données brutes JSON
   │
   ├──► PdfService / ExcelService / PptxService
   │         │
   │         └──► Fichier exporté sur disque
   │
   └──► AuthService ──► electron.safeStorage (PAT chiffré)
```

---

## 3. API AZURE DEVOPS UTILISÉES

| Endpoint | Usage |
|----------|-------|
| `GET /_apis/projects` | Liste des projets |
| `GET /{project}/_apis/test/plans` | Plans de test |
| `GET /{project}/_apis/test/plans/{id}/suites` | Suites |
| `GET /{project}/_apis/test/suites/{id}/testcases` | Cas de test |
| `GET /{project}/_apis/test/runs` | Exécutions |
| `GET /{project}/_apis/test/runs/{runId}/results` | Résultats |
| `GET /{project}/_apis/wit/workitems/{id}` | Work items (bugs/exigences) |

**Authentification :** Basic Auth avec PAT encodé en Base64  
`Authorization: Basic ${btoa(':' + pat)}`

---

## 4. ROADMAP — 8 SEMAINES

### Phase 1 — Foundation (Semaines 1-2)
- [x] Setup projet Electron + React + Vite
- [ ] Structure des dossiers
- [ ] Connexion ADO + test PAT
- [ ] Stockage chiffré des credentials
- [ ] Navigation entre écrans (React Router)

### Phase 2 — Data Layer (Semaines 3-4)
- [ ] AdoService complet (tous les endpoints)
- [ ] Extraction plans/suites/cas/résultats
- [ ] Stores Zustand
- [ ] Écran sélection plan de test
- [ ] Formulaire métadonnées (14 champs)

### Phase 3 — Exports (Semaines 5-6)
- [ ] Export PDF (PDFKit) — rapport complet
- [ ] Export Excel (ExcelJS)
- [ ] Export PowerPoint (PptxGenJS)
- [ ] Export HTML interactif
- [ ] Charts (Chart.js) dans les exports

### Phase 4 — Features avancées (Semaines 7-8)
- [ ] Comparaison de plans
- [ ] Alertes taux < 80%
- [ ] Exports périodiques (node-schedule)
- [ ] Envoi email (Nodemailer)
- [ ] Templates personnalisables
- [ ] Packaging .exe (Electron Builder)
- [ ] Tests & optimisation taille

---

## 5. DÉPENDANCES NPM

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@mui/material": "^5.15.0",
    "@mui/icons-material": "^5.15.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "electron-store": "^8.1.0",
    "pdfkit": "^0.14.0",
    "exceljs": "^4.4.0",
    "pptxgenjs": "^3.12.0",
    "chart.js": "^4.4.0",
    "nodemailer": "^6.9.0",
    "node-schedule": "^2.1.0"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0"
  }
}
```
