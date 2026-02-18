# TFSReporter 🚀

Application desktop Windows pour générer des rapports de test professionnels depuis Azure DevOps Server.

## Prérequis

- **Node.js** v18+ ([télécharger](https://nodejs.org))
- **Git** (optionnel)

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer en mode développement
npm run dev
```

## Build (exécutable Windows)

```bash
# Génère un .exe portable dans /release/
npm run build
```

## Structure du projet

```
TFSReporter/
├── src/
│   ├── main/                     ← Electron (Node.js)
│   │   ├── index.js              ← Point d'entrée Electron
│   │   ├── preload.js            ← Bridge sécurisé IPC
│   │   ├── ipcHandlers/          ← Handlers IPC (auth, ado, export, schedule)
│   │   ├── services/
│   │   │   ├── AdoService.js     ← Client API Azure DevOps
│   │   │   ├── AuthService.js    ← Gestion connexions & PAT
│   │   │   ├── PdfService.js     ← Export PDF professionnel
│   │   │   ├── ExcelService.js   ← Export Excel multi-feuilles
│   │   │   ├── PptxService.js    ← Export PowerPoint comité
│   │   │   └── HtmlService.js    ← Export HTML interactif
│   │   └── store/
│   │       └── store.js          ← electron-store (persistance chiffrée)
│   └── renderer/                 ← React UI
│       ├── App.jsx               ← Router principal
│       ├── index.jsx             ← Point d'entrée React
│       ├── components/
│       │   └── Layout/
│       │       └── AppLayout.jsx ← Sidebar + navigation
│       ├── pages/
│       │   ├── ConnectionPage.jsx   ← Connexion ADO (PAT)
│       │   ├── DashboardPage.jsx    ← Tableau de bord + KPIs
│       │   ├── ReportBuilderPage.jsx← Wizard génération rapport
│       │   └── SettingsPage.jsx     ← Paramètres
│       ├── store/                ← Zustand stores
│       └── theme/                ← Thème MUI dark (Catppuccin)
├── specs/                        ← Documentation architecture
├── package.json
└── vite.config.js
```

## Utilisation

1. **Connexion** : Entrer l'URL de votre Azure DevOps Server + PAT
2. **Dashboard** : Sélectionner projet → plan de test → Analyser
3. **Rapport** : Remplir les 14 métadonnées → Choisir le format → Générer
4. **Formats** : PDF · Excel · PowerPoint · HTML interactif

## Formats d'export

| Format | Description |
|--------|-------------|
| **PDF** | Rapport professionnel complet avec page de garde, KPIs, tableau des résultats |
| **Excel** | Classeur multi-feuilles : Synthèse, Résultats, Suites, Bugs |
| **PowerPoint** | Présentation comité de pilotage avec graphiques |
| **HTML** | Rapport interactif avec filtres et graphiques Chart.js |
