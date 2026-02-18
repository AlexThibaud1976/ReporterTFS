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
│   │   │   ├── AdoService.js     ← Client API Azure DevOps + traçabilité
│   │   │   ├── AuthService.js    ← Gestion connexions & PAT
│   │   │   ├── EmailService.js   ← Envoi de rapports par mail (Nodemailer)
│   │   │   ├── ScheduleService.js← Planification automatique (node-schedule)
│   │   │   ├── PdfService.js     ← Export PDF professionnel
│   │   │   ├── ExcelService.js   ← Export Excel multi-feuilles
│   │   │   ├── PptxService.js    ← Export PowerPoint comité
│   │   │   └── HtmlService.js    ← Export HTML interactif + traçabilité
│   │   └── store/
│   │       └── store.js          ← electron-store (persistance chiffrée)
│   └── renderer/                 ← React UI
│       ├── App.jsx               ← Router principal
│       ├── index.jsx             ← Point d'entrée React
│       ├── components/
│       │   └── Layout/
│       │       └── AppLayout.jsx ← Sidebar + navigation
│       ├── pages/
│       │   ├── ConnectionPage.jsx    ← Connexion ADO (PAT)
│       │   ├── DashboardPage.jsx     ← Tableau de bord + KPIs
│       │   ├── ReportBuilderPage.jsx ← Wizard génération rapport
│       │   ├── ComparisonPage.jsx    ← Comparaison de plans de test
│       │   ├── ReportHistoryPage.jsx ← Historique des rapports générés
│       │   └── SettingsPage.jsx      ← Paramètres (email, planification, template)
│       ├── store/                ← Zustand stores
│       └── theme/                ← Thème MUI dark (Catppuccin)
├── specs/                        ← Documentation architecture
├── package.json
└── vite.config.js
```

## Utilisation

1. **Connexion** : Entrer l'URL de votre Azure DevOps Server + PAT
2. **Dashboard** : Sélectionner projet → plan de test → Analyser
3. **Rapport** : Remplir les métadonnées → Choisir le format → Générer
4. **Historique** : Consulter tous les rapports générés, filtrés par plan de test
5. **Paramètres** : Configurer l'envoi email, la planification automatique et le template

## Formats d'export

| Format | Description |
|--------|-------------|
| **PDF** | Rapport professionnel complet avec page de garde, KPIs, tableau des résultats |
| **Excel** | Classeur multi-feuilles : Synthèse, Résultats, Suites, Bugs |
| **PowerPoint** | Présentation comité de pilotage avec graphiques |
| **HTML** | Rapport interactif avec filtres, graphiques Chart.js, traçabilité et liens ADO |

## Fonctionnalités

### Génération de rapports
- Wizard en 3 étapes : métadonnées → format → génération
- **Nommage horodaté** : `TFSReport_<ref>_YYYY-MM-DD_HH-MM-SS.<ext>` — plus de collision de noms si plusieurs rapports sont générés le même jour
- Multi-format : exporter simultanément en PDF, Excel, PPTX et HTML

### Traçabilité (HTML uniquement)
Le rapport HTML intègre automatiquement deux sections enrichies, récupérées depuis l'API ADO :

- **Traçabilité des cas de test** : pour chaque test case, affiche les exigences liées (User Story / Requirement) ainsi que la chaîne hiérarchique Feature → Epic, chaque élément étant un lien cliquable vers ADO
- **Tableau des bugs** : si des bugs sont associés, affiche un tableau dédié avec état, sévérité, priorité, assigné, et un lien direct vers chaque bug dans ADO
- La colonne Bugs du tableau des résultats affiche des liens 🐛 `#ID` cliquables

> La traçabilité est récupérée en batch via `_apis/wit/workitems?$expand=relations`. En cas de permissions insuffisantes, la section est simplement omise sans bloquer la génération du rapport.

### Historique des rapports
- Page dédiée dans la sidebar : **Historique**
- Entrées groupées par plan de test, filtrables via un sélecteur
- Par entrée : nom/version de l'app, taux de réussite (puce verte ≥80% / rouge <80%), statut global, formats exportés, date et heure
- Bouton **Ouvrir** par fichier (désactivé si le fichier n'existe plus sur le disque)
- Suppression individuelle ou globale avec confirmation
- Persistance locale chiffrée (200 entrées max, FIFO)

### Comparaison de plans
- Page **Comparer plans** : compare les métriques de deux plans de test côte à côte

### Planification automatique
- Génération périodique de rapports (cron via `node-schedule`)
- Gestion des tâches planifiées depuis la page Paramètres (créer, activer/désactiver, supprimer)

### Envoi par email
- Envoi des rapports générés via SMTP (Nodemailer)
- Configuration SMTP testable depuis la page Paramètres

### Template de rapport
- Personnalisation du logo, du titre et des couleurs depuis la page Paramètres
