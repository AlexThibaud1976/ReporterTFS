# TFSReporter 🚀

Application desktop Windows pour générer des rapports de test professionnels depuis Azure DevOps Server.

## Prérequis

- **Node.js** v18+ ([télécharger](https://nodejs.org))
- **Git** (optionnel)
- Accès à un **Azure DevOps Server** (on-premise) ou **Azure DevOps Services** (cloud) avec un PAT disposant au minimum des permissions _Test Plans (Read)_ et _Work Items (Read)_

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer en mode développement
npm run dev
```

## Build (exécutable Windows)

```bash
# Génère un .exe portable ET un installeur NSIS dans /release/
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

1. **Connexion** : Entrer l'URL ou le nom d'organisation ADO + PAT + version API → plusieurs profils de connexion sauvegardables
2. **Dashboard** : Sélectionner projet → plan de test → filtrer par suite(s) → Analyser
3. **Rapport** : Remplir les métadonnées → Choisir le format → Générer
4. **Historique** : Consulter tous les rapports générés, filtrés par plan de test
5. **Paramètres** : Configurer l'envoi email, la planification automatique et le template

## Formats d'export

| Format | Description |
|--------|-------------|
| **PowerPoint** | Présentation comité de pilotage : couverture, KPIs, taux de réussite, résultats par statut, suites, traçabilité, bugs, conclusion |
| **HTML** | Rapport interactif avec filtres, graphiques Chart.js, traçabilité et liens ADO |

> Les services PDF et Excel restent disponibles en backend mais ne sont pas exposés dans l'interface actuelle.

## Fonctionnalités

### Gestion des connexions
- Plusieurs profils de connexion sauvegardables et commutables depuis la page de connexion
- Supporte **Azure DevOps Cloud** (`dev.azure.com/<org>` ou nom d'organisation simple) et **ADO Server on-premise** (`http://server:8080/tfs/Collection`)
- Sélection de la version API : `5.0` (recommandé Test Plans), `6.0` (ADO Server 2019+), `7.0` (ADO Server 2022)
- PAT stocké chiffré localement (electron-store)
- Bouton **Tester la connexion** avant de sauvegarder
- Déconnexion et suppression de profil depuis l'interface

### Génération de rapports
- Wizard en 3 étapes : métadonnées → format → génération
- **Nommage horodaté** : `TFSReport_<ref>_YYYY-MM-DD_HH-MM-SS.<ext>` — plus de collision de noms si plusieurs rapports sont générés le même jour
- Formats disponibles : **PowerPoint** et **HTML** (multi-sélection possible)
- Option **pièces jointes** : inclut les captures d'écran et attachements liés aux cas de test

### Traçabilité (HTML et PowerPoint)
Les deux formats intègrent automatiquement des sections enrichies de traçabilité, récupérées depuis l'API ADO :

- **Traçabilité des cas de test** : pour chaque test case, affiche les exigences liées (User Story / Requirement) ainsi que la chaîne hiérarchique Feature → Epic, chaque élément étant un lien cliquable vers ADO (HTML) ou une diapositive dédiée (PPTX)
- **Tableau des bugs** : si des bugs sont associés, affiche un tableau dédié avec état, sévérité, priorité, assigné, et un lien direct vers chaque bug dans ADO
- La colonne Bugs du tableau des résultats (HTML) affiche des liens 🐛 `#ID` cliquables

> La traçabilité est récupérée en batch via `_apis/wit/workitems?$expand=relations`. En cas de permissions insuffisantes, la section est simplement omise sans bloquer la génération du rapport.

### Historique des rapports
- Page dédiée dans la sidebar : **Historique**
- Entrées groupées par plan de test, filtrables via un sélecteur
- Par entrée : nom/version de l'app, taux de réussite (puce verte ≥80% / rouge <80%), statut global, formats exportés, date et heure
- Bouton **Ouvrir** par fichier (désactivé si le fichier n'existe plus sur le disque)
- Suppression individuelle ou globale avec confirmation
- Persistance locale chiffrée (200 entrées max, FIFO)

### Filtrage par suite
- Sur le Dashboard, sélectionner une ou plusieurs suites de test pour restreindre l'analyse et les métriques affichées

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
