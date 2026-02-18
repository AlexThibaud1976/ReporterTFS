# Constitution - TFSReporter

> Version 1.0.0 - 18 Février 2026  
> Principes non-négociables pour l'application TFSReporter

---

## 🎯 Mission

Créer une application desktop Windows professionnelle et portable (fichier unique .exe) pour générer des rapports de test Azure DevOps Server 2022.1, destinée aux testeurs et test managers.

---

## 🔒 Principes Architecturaux Immuables

### 1. Portabilité & Distribution

- **UN SEUL FICHIER EXÉCUTABLE** : L'application DOIT être distribuée en un seul fichier .exe
- **AUCUNE INSTALLATION REQUISE** : Double-clic pour lancer, aucun setup.exe
- **AUTONOME** : Toutes les dépendances embarquées (runtime, librairies, assets)
- **TAILLE CIBLE** : < 150 MB pour le fichier final
- **COMPATIBILITÉ** : Windows 10/11 64-bit minimum

### 2. Interface Utilisateur

- **GUI MODERNE** : Interface graphique professionnelle, pas de CLI
- **STYLE** : Design moderne inspiré de Microsoft Fluent Design / Azure DevOps
- **COULEURS** : Palette Azure DevOps (Bleu #0078D4 principal)
- **ACCESSIBILITÉ** : Support clavier, contraste élevé, textes lisibles
- **RESPONSIVE** : S'adapte aux résolutions 1366x768 minimum
- **LANGUE** : Interface en français

### 3. Sécurité & Authentification

- **AUTHENTIFICATION** : Uniquement via Personal Access Token (PAT)
- **STOCKAGE SÉCURISÉ** : Credentials encryptés avec DPAPI Windows
- **AUCUN STOCKAGE CLOUD** : Toutes les données restent locales
- **HTTPS OBLIGATOIRE** : Toutes les communications API en HTTPS
- **VALIDATION** : Validation stricte des entrées utilisateur

### 4. Performance & Fiabilité

- **TEMPS DE DÉMARRAGE** : < 3 secondes
- **GÉNÉRATION RAPPORT** : < 30 secondes pour un plan de 500 tests
- **GESTION MÉMOIRE** : < 500 MB RAM en utilisation normale
- **RÉSILIENCE** : Gestion gracieuse des erreurs réseau/API
- **LOGGING** : Logs détaillés pour débogage (fichier logs local)

### 5. Formats de Sortie (Tous Obligatoires)

L'application DOIT supporter ces formats :
- **PDF** : Rapport professionnel pour management
- **Excel (.xlsx)** : Export pour analyse de données
- **HTML** : Dashboard interactif avec graphiques
- **PowerPoint (.pptx)** : Présentation exécutive
- **JSON/XML** : Export pour intégration systèmes tiers

### 6. Stack Technique Imposé

**Framework** : Electron (pour portabilité et UI moderne)  
**Packaging** : electron-builder (génération .exe unique)  
**Langage** : JavaScript/TypeScript  
**UI Framework** : React + Material-UI ou Ant Design  
**State Management** : Redux ou Zustand  
**API Client** : Axios avec retry logic  
**Graphiques** : Chart.js  
**PDF** : PDFKit ou jsPDF  
**Excel** : ExcelJS  
**PowerPoint** : PptxGenJS  

**Justification Electron** :
✅ Réutilise le code Node.js déjà développé  
✅ UI moderne avec React  
✅ Packaging en un seul .exe via ASAR  
✅ Multi-plateforme si besoin futur  
✅ Écosystème riche de librairies  

### 7. Qualité du Code

- **TESTS UNITAIRES** : Couverture minimum 70%
- **LINTING** : ESLint avec configuration stricte
- **FORMATTING** : Prettier avec config uniforme
- **DOCUMENTATION** : JSDoc pour toutes les fonctions publiques
- **ERROR HANDLING** : Try-catch systématique, messages clairs
- **VERSIONNING** : Semantic versioning (MAJOR.MINOR.PATCH)

### 8. Expérience Utilisateur

- **WIZARD DE CONFIGURATION** : Premier lancement guidé pas-à-pas
- **VALIDATION TEMPS RÉEL** : Feedback immédiat sur les erreurs
- **INDICATEURS DE PROGRESSION** : Progress bars pour opérations longues
- **TOOLTIPS** : Aide contextuelle sur tous les champs
- **MESSAGES D'ERREUR** : En français, explicites, avec solutions
- **PREVIEW** : Aperçu du rapport avant export final

### 9. Données & Configuration

- **CONFIGURATION** : Fichier config.json dans %APPDATA%
- **CREDENTIALS** : Stockage sécurisé Windows Credential Manager
- **TEMPLATES** : Templates de rapports personnalisables
- **HISTORIQUE** : Derniers 20 rapports générés accessibles
- **EXPORT CONFIG** : Possibilité d'exporter/importer la config

### 10. Conformité Azure DevOps

- **API VERSION** : Azure DevOps Server 2022.1 REST API v7.1
- **RATE LIMITING** : Respect des limites (300 requêtes/minute)
- **PAGINATION** : Gestion correcte des résultats paginés
- **AUTHENTIFICATION** : Support PAT uniquement (pas de OAuth)
- **COMPATIBILITY** : Compatible avec TFS 2018+ et Azure DevOps Services

---

## 🚫 Anti-Patterns Interdits

**JAMAIS** :
- ❌ Stocker les PAT en clair
- ❌ Faire des appels API synchrones bloquants
- ❌ Ignorer les erreurs silencieusement
- ❌ Utiliser alert() pour les erreurs
- ❌ Hardcoder des credentials
- ❌ Générer des rapports incomplets sans prévenir
- ❌ Crasher l'application sur erreur réseau
- ❌ Dépasser 200 MB de RAM inutilement

---

## ✅ Checklist de Validation

Avant chaque release, TOUTES ces conditions doivent être TRUE :

- [ ] Build en un seul .exe fonctionnel
- [ ] Démarrage < 3 secondes
- [ ] Tous les formats d'export fonctionnent
- [ ] Gestion des erreurs réseau testée
- [ ] Interface responsive testée (1366x768+)
- [ ] PAT encrypté et jamais en logs
- [ ] Tests unitaires passent (>70% coverage)
- [ ] Documentation utilisateur à jour
- [ ] Logs détaillés sans données sensibles
- [ ] Installation sur PC vierge testée

---

## 📐 Architecture de Référence

```
TFSReporter/
├── main/                    # Electron main process
│   ├── main.js             # Point d'entrée
│   ├── api/                # Azure DevOps API client
│   ├── exporters/          # PDF, Excel, PPT generators
│   └── security/           # Credential management
├── renderer/               # Electron renderer (React UI)
│   ├── components/         # React components
│   ├── pages/              # Page components
│   ├── store/              # Redux store
│   └── utils/              # Utilities
├── shared/                 # Code partagé
│   ├── constants/          # Constantes
│   └── types/              # TypeScript types
└── assets/                 # Images, fonts, icons
```

---

## 🎨 Design System

**Palette de Couleurs** :
- Primary: `#0078D4` (Azure Blue)
- Success: `#107C10` (Green)
- Error: `#D13438` (Red)
- Warning: `#FF8C00` (Orange)
- Background: `#FAFAFA`
- Text: `#323130`

**Typographie** :
- Font: Segoe UI (fallback: Roboto)
- Tailles: 12px (body), 14px (labels), 18px (h3), 24px (h2), 32px (h1)

**Spacing** : Multiples de 8px (8, 16, 24, 32, 40)

---

## 📊 Métriques de Succès

**Performance** :
- Temps de démarrage < 3s
- Génération rapport 100 tests < 5s
- Génération rapport 500 tests < 30s

**Qualité** :
- 0 crash sur 100 générations
- < 1% d'erreurs API avec retry
- 100% des formats exportables

**Adoption** :
- < 5 minutes pour générer le 1er rapport
- Taux de satisfaction > 4/5

---

Cette constitution est **IMMUABLE** durant le développement.  
Toute modification nécessite validation explicite de l'équipe.
