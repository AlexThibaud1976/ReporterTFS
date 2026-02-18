# Plan Technique - TFSReporter v1.0

> Architecture, Stack Technique et Roadmap de Développement  
> 18 Février 2026

---

## 📖 Table des Matières

1. [Vue d'Ensemble Technique](#vue-densemble-technique)
2. [Architecture](#architecture)
3. [Stack Technologique](#stack-technologique)
4. [Structure du Projet](#structure-du-projet)
5. [Modules Détaillés](#modules-détaillés)
6. [Flux de Données](#flux-de-données)
7. [Sécurité](#sécurité)
8. [Packaging & Distribution](#packaging--distribution)
9. [Roadmap de Développement](#roadmap-de-développement)
10. [Tâches de Développement](#tâches-de-développement)

---

## 🎯 Vue d'Ensemble Technique

### Décision : Electron + React

**Electron** a été choisi car :
- ✅ Réutilise 100% du code Node.js déjà développé (lib/reporter.js, emailer.js, etc.)
- ✅ Interface moderne avec React + Material-UI
- ✅ Packaging en un seul .exe via electron-builder + ASAR
- ✅ Écosystème riche : PDFKit, ExcelJS, PptxGenJS, Chart.js
- ✅ Multi-plateforme si besoin futur (Mac, Linux)
- ✅ Auto-update intégré (pour futures versions)

**Alternative rejetée : .NET WPF**
- ❌ Nécessite réécriture complète en C#
- ❌ Écosystème moins riche pour génération rapports
- ❌ Plus complexe pour graphiques interactifs

---

## 🏗️ Architecture

### Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                     ELECTRON APP                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │  Main Process    │◄────────┤  Renderer (React)│        │
│  │  (Node.js)       │  IPC    │  (UI)            │        │
│  └──────────────────┘         └──────────────────┘        │
│         │                              │                   │
│         │                              │                   │
│    ┌────▼─────┐                   ┌───▼────┐             │
│    │ Azure    │                   │ State  │             │
│    │ DevOps   │                   │(Redux) │             │
│    │ API      │                   └────────┘             │
│    │ Client   │                                           │
│    └────┬─────┘                                           │
│         │                                                 │
│    ┌────▼──────────────────────────────┐                │
│    │  Report Generators                │                │
│    ├───────────────────────────────────┤                │
│    │  • PDF (PDFKit)                   │                │
│    │  • Excel (ExcelJS)                │                │
│    │  • PowerPoint (PptxGenJS)         │                │
│    │  • HTML (Template Engine)         │                │
│    │  • JSON/XML (Native)              │                │
│    └───────────────────────────────────┘                │
│                                                            │
└────────────────────────────────────────────────────────────┘
                        │
                        ▼
            ┌──────────────────────┐
            │  Azure DevOps Server │
            │  REST API v7.1       │
            └──────────────────────┘
```

### Architecture en Couches

```
┌────────────────────────────────────────────────┐
│  PRESENTATION LAYER (React Components)         │
│  - Pages, Forms, Charts, Modals               │
└────────────────────────────────────────────────┘
                    ↕ IPC
┌────────────────────────────────────────────────┐
│  APPLICATION LAYER (Main Process)              │
│  - Business Logic, Orchestration               │
└────────────────────────────────────────────────┘
                    ↕
┌────────────────────────────────────────────────┐
│  SERVICES LAYER                                │
│  - Azure API, Email, Reports, Security         │
└────────────────────────────────────────────────┘
                    ↕
┌────────────────────────────────────────────────┐
│  DATA LAYER                                    │
│  - Config, Cache, Logs                         │
└────────────────────────────────────────────────┘
```

---

## 💻 Stack Technologique

### Core Framework
```json
{
  "electron": "^28.0.0",
  "electron-builder": "^24.9.0"
}
```

### Frontend (Renderer)
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "@mui/material": "^5.15.0",
  "@mui/icons-material": "^5.15.0",
  "@emotion/react": "^11.11.0",
  "@emotion/styled": "^11.11.0"
}
```

### State Management
```json
{
  "zustand": "^4.5.0"
}
```
> Zustand choisi car plus simple que Redux pour cette app

### API Client
```json
{
  "axios": "^1.6.2",
  "axios-retry": "^4.0.0"
}
```

### Report Generation
```json
{
  "pdfkit": "^0.14.0",
  "exceljs": "^4.3.0",
  "pptxgenjs": "^3.12.0",
  "chart.js": "^4.4.1",
  "chartjs-node-canvas": "^4.1.6"
}
```

### Email
```json
{
  "nodemailer": "^6.9.7"
}
```

### Security
```json
{
  "electron-store": "^8.1.0",
  "keytar": "^7.9.0"
}
```
> keytar pour Windows Credential Manager

### Utilities
```json
{
  "date-fns": "^3.0.0",
  "lodash": "^4.17.21",
  "winston": "^3.11.0"
}
```

### Development
```json
{
  "typescript": "^5.3.3",
  "@types/react": "^18.2.0",
  "@types/node": "^20.10.0",
  "eslint": "^8.55.0",
  "prettier": "^3.1.0",
  "jest": "^29.7.0",
  "@testing-library/react": "^14.1.0"
}
```

---

## 📁 Structure du Projet

```
TFSReporter/
├── package.json
├── electron-builder.json         # Config packaging
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
│
├── src/
│   ├── main/                     # Electron Main Process
│   │   ├── main.ts              # Entry point
│   │   ├── ipc-handlers.ts      # IPC communication
│   │   ├── window-manager.ts    # Window management
│   │   │
│   │   ├── services/
│   │   │   ├── azure-api.service.ts       # Azure DevOps API client
│   │   │   ├── report.service.ts          # Report orchestration
│   │   │   ├── pdf.service.ts             # PDF generation
│   │   │   ├── excel.service.ts           # Excel generation
│   │   │   ├── pptx.service.ts            # PowerPoint generation
│   │   │   ├── html.service.ts            # HTML generation
│   │   │   ├── email.service.ts           # Email sending
│   │   │   ├── security.service.ts        # Credential management
│   │   │   ├── config.service.ts          # Config persistence
│   │   │   ├── logger.service.ts          # Logging
│   │   │   └── scheduler.service.ts       # Automated exports
│   │   │
│   │   ├── models/
│   │   │   ├── test-plan.model.ts
│   │   │   ├── test-suite.model.ts
│   │   │   ├── test-case.model.ts
│   │   │   ├── test-result.model.ts
│   │   │   ├── bug.model.ts
│   │   │   ├── requirement.model.ts
│   │   │   └── project-metadata.model.ts
│   │   │
│   │   └── utils/
│   │       ├── retry.util.ts
│   │       ├── cache.util.ts
│   │       └── validation.util.ts
│   │
│   ├── renderer/                 # React UI
│   │   ├── index.tsx            # Entry point
│   │   ├── App.tsx              # Main component
│   │   │
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── WizardPage.tsx
│   │   │   ├── ReportPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── AutomationPage.tsx
│   │   │   └── HistoryPage.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── ProgressBar.tsx
│   │   │   │   └── Notification.tsx
│   │   │   │
│   │   │   ├── forms/
│   │   │   │   ├── MetadataForm.tsx
│   │   │   │   ├── ConnectionForm.tsx
│   │   │   │   └── EmailConfigForm.tsx
│   │   │   │
│   │   │   ├── charts/
│   │   │   │   ├── PieChart.tsx
│   │   │   │   ├── BarChart.tsx
│   │   │   │   ├── LineChart.tsx
│   │   │   │   └── GaugeChart.tsx
│   │   │   │
│   │   │   └── wizard/
│   │   │       ├── Step1Connection.tsx
│   │   │       ├── Step2TestAuth.tsx
│   │   │       ├── Step3EmailConfig.tsx
│   │   │       └── Step4Complete.tsx
│   │   │
│   │   ├── store/
│   │   │   ├── app.store.ts           # Zustand store
│   │   │   ├── slices/
│   │   │   │   ├── auth.slice.ts
│   │   │   │   ├── testplan.slice.ts
│   │   │   │   ├── metadata.slice.ts
│   │   │   │   ├── report.slice.ts
│   │   │   │   └── ui.slice.ts
│   │   │   └── actions/
│   │   │       └── report.actions.ts
│   │   │
│   │   ├── hooks/
│   │   │   ├── useIPC.ts
│   │   │   ├── useTestPlans.ts
│   │   │   └── useReportGeneration.ts
│   │   │
│   │   ├── styles/
│   │   │   ├── theme.ts              # MUI theme
│   │   │   └── global.css
│   │   │
│   │   └── utils/
│   │       ├── format.util.ts
│   │       ├── validation.util.ts
│   │       └── date.util.ts
│   │
│   ├── shared/                   # Code partagé
│   │   ├── constants.ts
│   │   ├── types.ts
│   │   └── ipc-channels.ts       # IPC channel names
│   │
│   └── assets/
│       ├── icons/
│       │   ├── icon.png
│       │   └── icon.ico
│       ├── images/
│       │   └── logo.png
│       └── templates/
│           ├── pdf-template.ts
│           ├── excel-template.ts
│           └── pptx-template.ts
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   └── components/
│   └── integration/
│       └── report-generation.test.ts
│
├── build/                        # Build assets
│   ├── icon.ico
│   └── background.png
│
└── dist/                         # Build output
    └── TFSReporter-Setup.exe
```

---

## 🔧 Modules Détaillés

### 1. Azure DevOps API Client

**Fichier** : `src/main/services/azure-api.service.ts`

**Responsabilités** :
- Connexion à Azure DevOps Server
- Authentification PAT
- Appels REST API v7.1
- Gestion pagination
- Retry logic (3 tentatives)
- Cache local (30 min)

**Méthodes Principales** :
```typescript
class AzureDevOpsApiService {
  // Connexion
  async testConnection(): Promise<boolean>
  
  // Plans de test
  async getTestPlans(): Promise<TestPlan[]>
  async getTestPlan(id: number): Promise<TestPlan>
  
  // Suites
  async getTestSuites(planId: number): Promise<TestSuite[]>
  
  // Cas de test
  async getTestCases(planId: number, suiteId: number): Promise<TestCase[]>
  
  // Résultats
  async getTestRuns(planId: number): Promise<TestRun[]>
  async getTestResults(runId: number): Promise<TestResult[]>
  
  // Bugs
  async getBugsByTestCase(testCaseId: number): Promise<Bug[]>
  
  // Requirements
  async getRequirementsByTestCase(testCaseId: number): Promise<Requirement[]>
}
```

**Gestion Erreurs** :
```typescript
try {
  const response = await axios.get(url, config);
  return response.data;
} catch (error) {
  if (error.response?.status === 401) {
    throw new AuthenticationError('PAT invalide');
  } else if (error.response?.status === 404) {
    throw new NotFoundError('Ressource introuvable');
  } else if (error.code === 'ENOTFOUND') {
    throw new NetworkError('Serveur inaccessible');
  }
  throw error;
}
```

---

### 2. PDF Generator

**Fichier** : `src/main/services/pdf.service.ts`

**Librairie** : PDFKit

**Structure PDF** :
```typescript
class PdfService {
  async generatePDF(data: ReportData): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    
    // Page de garde
    this.addCoverPage(doc, data.metadata);
    
    // Informations métier
    this.addMetadataSection(doc, data.metadata);
    
    // Résumé exécutif
    this.addExecutiveSummary(doc, data.metrics);
    
    // Graphiques (Chart.js → PNG → PDF)
    const chartPng = await this.generateChart(data.metrics);
    doc.image(chartPng, { width: 500 });
    
    // Détails par suite
    this.addSuitesDetails(doc, data.suites);
    
    // Bugs
    this.addBugsSection(doc, data.bugs);
    
    // Annexes
    this.addAppendices(doc, data);
    
    doc.end();
    return doc;
  }
}
```

**Graphiques en PDF** :
```typescript
// Utiliser chartjs-node-canvas pour générer PNG
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
  width: 800, 
  height: 600 
});

const chartConfig = {
  type: 'pie',
  data: { /* ... */ }
};

const imageBuffer = await chartJSNodeCanvas.renderToBuffer(chartConfig);
doc.image(imageBuffer, x, y, { width: 400 });
```

---

### 3. Excel Generator

**Fichier** : `src/main/services/excel.service.ts`

**Librairie** : ExcelJS

**Structure Excel** :
```typescript
class ExcelService {
  async generateExcel(data: ReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    // Onglet 1: Dashboard
    const dashboard = workbook.addWorksheet('Dashboard');
    this.addDashboard(dashboard, data.metrics);
    this.addCharts(dashboard, data.metrics); // Charts Excel natifs
    
    // Onglet 2: Tests
    const tests = workbook.addWorksheet('Tests');
    this.addTestsTable(tests, data.testCases);
    tests.autoFilter = 'A1:G1'; // Filtres auto
    
    // Onglet 3: Résultats
    const results = workbook.addWorksheet('Résultats');
    this.addResultsTable(results, data.results);
    
    // Onglet 4: Bugs
    const bugs = workbook.addWorksheet('Bugs');
    this.addBugsTable(bugs, data.bugs);
    
    // Onglet 5: Tendances
    const trends = workbook.addWorksheet('Tendances');
    this.addTrendsData(trends, data.trends);
    
    // Mise en forme conditionnelle
    results.addConditionalFormatting({
      ref: 'B2:B1000',
      rules: [
        {
          type: 'cellIs',
          operator: 'equal',
          formulae: ['"Passed"'],
          style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF107C10' } } }
        },
        {
          type: 'cellIs',
          operator: 'equal',
          formulae: ['"Failed"'],
          style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD13438' } } }
        }
      ]
    });
    
    return await workbook.xlsx.writeBuffer();
  }
}
```

---

### 4. PowerPoint Generator

**Fichier** : `src/main/services/pptx.service.ts`

**Librairie** : PptxGenJS

**Structure PPTX** :
```typescript
class PptxService {
  async generatePPTX(data: ReportData): Promise<Buffer> {
    const pres = new PptxGenJS();
    
    // Slide 1: Titre
    const slide1 = pres.addSlide();
    slide1.background = { color: '0078D4' };
    slide1.addText(data.metadata.reportTitle, {
      x: 1, y: 2, fontSize: 44, bold: true, color: 'FFFFFF'
    });
    
    // Slide 2: Résumé Exécutif
    const slide2 = pres.addSlide();
    slide2.addText('Résumé Exécutif', { x: 0.5, y: 0.5, fontSize: 32, bold: true });
    slide2.addTable([
      ['Métrique', 'Valeur'],
      ['Total Tests', data.metrics.totalTestCases.toString()],
      ['Pass Rate', `${data.metrics.passRate}%`],
      ['Execution Rate', `${data.metrics.executionRate}%`]
    ], { x: 1, y: 1.5 });
    
    // Slide 3: Graphique Pie
    const chartData = [
      { name: 'Passed', labels: ['Passed'], values: [data.metrics.passed] },
      { name: 'Failed', labels: ['Failed'], values: [data.metrics.failed] }
    ];
    const slide3 = pres.addSlide();
    slide3.addChart(pres.ChartType.pie, chartData, { x: 1, y: 1 });
    
    // ... autres slides
    
    return await pres.write('arraybuffer');
  }
}
```

---

### 5. Security Service

**Fichier** : `src/main/services/security.service.ts`

**Librairie** : keytar (Windows Credential Manager)

**Gestion PAT** :
```typescript
import keytar from 'keytar';

class SecurityService {
  private SERVICE_NAME = 'TFSReporter';
  private ACCOUNT_NAME = 'AzureDevOpsPAT';
  
  // Sauvegarder PAT
  async savePAT(pat: string): Promise<void> {
    await keytar.setPassword(this.SERVICE_NAME, this.ACCOUNT_NAME, pat);
  }
  
  // Récupérer PAT
  async getPAT(): Promise<string | null> {
    return await keytar.getPassword(this.SERVICE_NAME, this.ACCOUNT_NAME);
  }
  
  // Supprimer PAT
  async deletePAT(): Promise<boolean> {
    return await keytar.deletePassword(this.SERVICE_NAME, this.ACCOUNT_NAME);
  }
  
  // Valider PAT
  validatePATFormat(pat: string): boolean {
    // Azure DevOps PAT: 52 caractères base64
    return /^[A-Za-z0-9+/]{52}$/.test(pat);
  }
}
```

---

### 6. IPC Communication

**Fichier** : `src/shared/ipc-channels.ts`

**Canaux IPC** :
```typescript
export const IPC_CHANNELS = {
  // Connexion
  TEST_CONNECTION: 'test-connection',
  SAVE_CONFIG: 'save-config',
  
  // Plans de test
  GET_TEST_PLANS: 'get-test-plans',
  GET_TEST_PLAN_DETAILS: 'get-test-plan-details',
  
  // Génération rapports
  GENERATE_REPORT: 'generate-report',
  REPORT_PROGRESS: 'report-progress',
  REPORT_COMPLETE: 'report-complete',
  REPORT_ERROR: 'report-error',
  
  // Email
  SEND_EMAIL: 'send-email',
  
  // Configuration
  GET_CONFIG: 'get-config',
  UPDATE_CONFIG: 'update-config'
};
```

**Handler Example** :
```typescript
// Main Process
ipcMain.handle(IPC_CHANNELS.GET_TEST_PLANS, async (event) => {
  try {
    const apiService = new AzureDevOpsApiService();
    const plans = await apiService.getTestPlans();
    return { success: true, data: plans };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Renderer Process
const { ipcRenderer } = window.require('electron');

const plans = await ipcRenderer.invoke(IPC_CHANNELS.GET_TEST_PLANS);
if (plans.success) {
  setTestPlans(plans.data);
} else {
  showError(plans.error);
}
```

---

## 🌊 Flux de Données

### Flux de Génération de Rapport

```
1. User clicks "Générer Rapport"
   ↓
2. Renderer → IPC → Main Process
   ↓
3. Main: Report Service orchestrates
   ├─> Azure API Service: Extract data
   │   ├─> GET /test/plans/{id}
   │   ├─> GET /test/plans/{id}/suites
   │   ├─> GET /test/plans/{id}/suites/{id}/testcases
   │   ├─> GET /test/runs
   │   └─> GET /test/runs/{id}/results
   │
   ├─> Calculate Metrics
   │
   ├─> PDF Service: Generate PDF
   │   └─> Chart Service: Generate charts PNG
   │
   ├─> Excel Service: Generate Excel
   │
   └─> HTML Service: Generate HTML
   
4. Main → IPC (progress events) → Renderer
   ↓
5. Main → IPC (completion) → Renderer
   ↓
6. Renderer: Show success + Open buttons
```

### Flux de Configuration Initiale (Wizard)

```
1. First launch detected
   ↓
2. Show Wizard
   ├─> Step 1: Enter Azure DevOps URL
   │   └─> Validate URL format
   │
   ├─> Step 2: Enter PAT
   │   ├─> Validate PAT format
   │   └─> Test connection
   │       ├─> Success: Save PAT (keytar)
   │       └─> Error: Show message
   │
   ├─> Step 3: Email Config (optional)
   │   ├─> Enter SMTP settings
   │   └─> Test email
   │
   └─> Step 4: Complete
       └─> Save config.json to %APPDATA%
```

---

## 🔒 Sécurité

### Stockage Credentials

**PAT Storage** :
```
Windows Credential Manager (keytar)
├─> Service: TFSReporter
├─> Account: AzureDevOpsPAT
└─> Password: [encrypted PAT]
```

**Config Storage** :
```
%APPDATA%/TFSReporter/config.json
{
  "azureDevOps": {
    "url": "https://dev.azure.com/company",
    "organization": "company",
    "project": "MyProject"
    // NO PAT HERE!
  },
  "email": {
    "smtp": "smtp.gmail.com",
    "port": 587,
    "user": "user@company.com"
    // NO PASSWORD HERE! Also in keytar
  }
}
```

### Validation Inputs

```typescript
// Validation URL
function validateAzureDevOpsUrl(url: string): boolean {
  const pattern = /^https:\/\/(dev\.azure\.com\/[\w-]+|[\w-]+\.visualstudio\.com)$/;
  return pattern.test(url);
}

// Validation PAT
function validatePAT(pat: string): boolean {
  return /^[A-Za-z0-9+/]{52}$/.test(pat);
}

// Sanitize SQL Injection (dans queries API)
function sanitize(input: string): string {
  return input.replace(/[^\w\s-]/g, '');
}
```

### HTTPS Enforcement

```typescript
const httpsAgent = new https.Agent({
  rejectUnauthorized: true, // Force HTTPS valid certs
  minVersion: 'TLSv1.2'
});

axios.create({
  httpsAgent,
  // ...
});
```

---

## 📦 Packaging & Distribution

### Electron Builder Configuration

**Fichier** : `electron-builder.json`

```json
{
  "appId": "com.company.tfsreporter",
  "productName": "TFSReporter",
  "copyright": "Copyright © 2026 Company",
  "directories": {
    "output": "dist",
    "buildResources": "build"
  },
  "files": [
    "dist-electron/**/*",
    "dist-renderer/**/*",
    "package.json"
  ],
  "win": {
    "target": [
      {
        "target": "portable",
        "arch": ["x64"]
      }
    ],
    "icon": "build/icon.ico",
    "artifactName": "TFSReporter-${version}-Portable.exe",
    "asar": true,
    "asarUnpack": [
      "node_modules/keytar/**/*"
    ]
  },
  "portable": {
    "artifactName": "TFSReporter-${version}.exe"
  },
  "compression": "maximum",
  "extraResources": [
    {
      "from": "src/assets/templates",
      "to": "templates"
    }
  ]
}
```

### Build Commands

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
    "dev:renderer": "vite",
    "dev:main": "tsc -p tsconfig.main.json && electron .",
    
    "build": "npm run build:renderer && npm run build:main",
    "build:renderer": "vite build",
    "build:main": "tsc -p tsconfig.main.json",
    
    "package": "npm run build && electron-builder",
    "package:win": "npm run build && electron-builder --win portable",
    
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx}\""
  }
}
```

### Output

```
dist/
├── TFSReporter-1.0.0.exe         ← Un seul fichier portable!
│   └── Contient:
│       ├── Electron runtime
│       ├── Chromium
│       ├── Node.js
│       ├── Application code (ASAR)
│       └── node_modules (bundled)
│
└── latest.yml                     ← Auto-update metadata
```

**Taille Cible** : 120-150 MB

---

## 🗓️ Roadmap de Développement

### Phase 1 : Setup & Infrastructure (Semaine 1)

**Objectif** : Projet structuré, build fonctionnel

- [x] Initialiser projet Electron + React + TypeScript
- [x] Configurer electron-builder
- [x] Setup ESLint + Prettier
- [x] Setup Jest pour tests
- [x] Créer structure de dossiers
- [x] Build basique fonctionnel (hello world)

**Livrables** :
- ✅ Projet qui compile
- ✅ .exe de test généré
- ✅ CI/CD GitHub Actions (optionnel)

---

### Phase 2 : Connexion Azure DevOps (Semaine 2)

**Objectif** : Connexion et extraction données fonctionnelles

**Tâches** :
- [ ] Wizard premier lancement (UI)
- [ ] Azure API Service (connexion, auth)
- [ ] Security Service (keytar)
- [ ] Test connection fonctionnel
- [ ] Extraction plans de test
- [ ] Extraction suites et test cases
- [ ] Extraction résultats
- [ ] Cache local (30 min)

**Tests** :
- Unit tests API service
- Integration test extraction complète

**Livrables** :
- ✅ Wizard configuré
- ✅ Données extraites et affichées dans UI

---

### Phase 3 : UI Principale (Semaine 3)

**Objectif** : Interface complète et fonctionnelle

**Tâches** :
- [ ] Page d'accueil
- [ ] Sélection plan de test
- [ ] Formulaire métadonnées (14 champs)
- [ ] Validation formulaire
- [ ] Sauvegarde templates métadonnées
- [ ] Sélection formats export
- [ ] Progress bar génération
- [ ] Historique rapports récents

**Tests** :
- Component tests (React Testing Library)
- E2E tests (Playwright)

**Livrables** :
- ✅ UI complète navigable
- ✅ Formulaire fonctionnel

---

### Phase 4 : Génération PDF (Semaine 4)

**Objectif** : PDF professionnel généré

**Tâches** :
- [ ] PDF Service (PDFKit)
- [ ] Page de garde
- [ ] Section métadonnées
- [ ] Résumé exécutif avec métriques
- [ ] Graphiques (Chart.js → PNG → PDF)
- [ ] Tableaux détails suites
- [ ] Section bugs
- [ ] Section requirements
- [ ] Annexes
- [ ] Table des matières
- [ ] Header/Footer

**Tests** :
- Test génération PDF complet
- Validation PDF valide (pdf-lib)

**Livrables** :
- ✅ PDF professionnel généré
- ✅ < 10s pour 500 tests

---

### Phase 5 : Génération Excel (Semaine 5)

**Objectif** : Export Excel exploitable

**Tâches** :
- [ ] Excel Service (ExcelJS)
- [ ] Onglet Dashboard avec métriques
- [ ] Onglet Tests avec filtres auto
- [ ] Onglet Résultats
- [ ] Onglet Bugs
- [ ] Onglet Tendances
- [ ] Graphiques Excel natifs
- [ ] Mise en forme conditionnelle
- [ ] Formules Excel

**Tests** :
- Test génération Excel complet
- Validation Excel valide

**Livrables** :
- ✅ Excel complet avec 5 onglets
- ✅ Formules et graphiques fonctionnels

---

### Phase 6 : Génération HTML (Semaine 6)

**Objectif** : Dashboard interactif

**Tâches** :
- [ ] HTML Service
- [ ] Template HTML avec Chart.js
- [ ] Graphiques interactifs (hover, zoom)
- [ ] Filtres temps réel (JavaScript)
- [ ] Recherche globale
- [ ] Dark mode toggle
- [ ] Responsive design
- [ ] Export JSON/CSV depuis browser

**Tests** :
- Test génération HTML
- Tests browser (Chrome, Edge, Firefox)

**Livrables** :
- ✅ Dashboard HTML interactif
- ✅ Fonctionne offline

---

### Phase 7 : Tests & Optimisation (Semaine 7)

**Objectif** : Application stable et performante

**Tâches** :
- [ ] Tests unitaires (>70% coverage)
- [ ] Tests intégration
- [ ] Tests E2E (Playwright)
- [ ] Profiling performance
- [ ] Optimisation mémoire
- [ ] Optimisation build size
- [ ] Gestion erreurs complète
- [ ] Logs structurés

**Tests** :
- Tous les tests passent
- Performance benchmarks

**Livrables** :
- ✅ Tests > 70% coverage
- ✅ 0 crash sur 100 runs
- ✅ Temps génération < targets

---

### Phase 8 : Packaging & Documentation (Semaine 8)

**Objectif** : Release v1.0 MVP

**Tâches** :
- [ ] Build final optimisé
- [ ] Code signing (optionnel)
- [ ] README.md utilisateur
- [ ] CHANGELOG.md
- [ ] Guide installation
- [ ] Guide utilisation
- [ ] FAQ
- [ ] Vidéo démo (optionnel)

**Livrables** :
- ✅ TFSReporter-1.0.0.exe (< 150 MB)
- ✅ Documentation complète
- ✅ Prêt pour distribution

---

## ✅ Tâches de Développement (Détaillées)

### Sprint 1 : Setup (Jours 1-5)

#### Tâche 1.1 : Initialiser Projet
```bash
npm init
npm install electron electron-builder --save-dev
npm install react react-dom @mui/material
npm install typescript @types/react --save-dev
```

#### Tâche 1.2 : Structure Dossiers
Créer toute l'arborescence définie dans "Structure du Projet"

#### Tâche 1.3 : Configuration Build
Créer `electron-builder.json` et scripts NPM

#### Tâche 1.4 : Hello World
```typescript
// main.ts
import { app, BrowserWindow } from 'electron';

app.on('ready', () => {
  const win = new BrowserWindow({ width: 1200, height: 800 });
  win.loadURL('http://localhost:5173'); // Vite dev server
});
```

---

### Sprint 2 : Azure API (Jours 6-12)

#### Tâche 2.1 : Azure API Service Base
```typescript
class AzureDevOpsApiService {
  private client: AxiosInstance;
  
  constructor(config: AzureConfig) {
    this.client = axios.create({
      baseURL: `${config.url}/${config.project}/_apis`,
      headers: {
        'Authorization': `Basic ${Buffer.from(`:${config.pat}`).toString('base64')}`
      }
    });
    
    // Retry logic
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay
    });
  }
}
```

#### Tâche 2.2 : Méthodes Extraction
Implémenter toutes les méthodes : getTestPlans, getTestSuites, etc.

#### Tâche 2.3 : Cache Local
```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 1800 }); // 30 min

async getTestPlans(): Promise<TestPlan[]> {
  const cacheKey = 'testplans';
  const cached = cache.get<TestPlan[]>(cacheKey);
  if (cached) return cached;
  
  const plans = await this.fetchTestPlans();
  cache.set(cacheKey, plans);
  return plans;
}
```

---

### Sprint 3-8 : Features Principales

*(Tâches détaillées pour chaque sprint similaires à Sprint 1-2)*

---

## 🎯 Critères de Complétion

### Checklist Release v1.0

**Fonctionnel** :
- [ ] Connexion Azure DevOps fonctionne
- [ ] Extraction données complète
- [ ] Formulaire métadonnées (14 champs)
- [ ] Export PDF professionnel
- [ ] Export Excel exploitable
- [ ] Export HTML interactif
- [ ] Graphiques corrects
- [ ] Gestion erreurs gracieuse

**Technique** :
- [ ] Build .exe < 150 MB
- [ ] Démarrage < 3s
- [ ] Génération 500 tests < 30s
- [ ] Tests coverage > 70%
- [ ] 0 credential en logs
- [ ] Logs structurés Winston

**Qualité** :
- [ ] 0 crash sur 100 runs
- [ ] Interface responsive
- [ ] Messages erreur clairs
- [ ] Documentation complète

---

**Ce plan technique est validé et prêt pour l'implémentation.**

_Prochaine étape : Commencer le développement Sprint 1._
