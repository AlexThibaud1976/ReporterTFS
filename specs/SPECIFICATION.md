# TFSReporter — SPECIFICATION
## User Stories & Wireframes

---

## EPIC 1 — Connexion & Configuration

### US-01 : Connexion Azure DevOps
**En tant que** testeur,  
**Je veux** saisir mon URL de serveur ADO et mon PAT une seule fois,  
**Afin de** ne plus avoir à m'authentifier à chaque lancement.

**Critères d'acceptation :**
- [ ] Champ URL serveur (ex: http://myserver:8080/tfs)
- [ ] Champ PAT masqué avec bouton "afficher"
- [ ] Bouton "Tester la connexion" avec feedback visuel
- [ ] PAT chiffré via electron safeStorage
- [ ] Option "Se souvenir de la connexion"

### US-02 : Gestion multi-organisations
**En tant que** testeur,  
**Je veux** gérer plusieurs connexions ADO sauvegardées,  
**Afin de** switcher rapidement entre projets/serveurs.

---

## EPIC 2 — Extraction de données

### US-03 : Sélection du plan de test
**En tant que** testeur,  
**Je veux** parcourir et sélectionner un plan de test ADO,  
**Afin de** choisir les données à inclure dans mon rapport.

**Critères d'acceptation :**
- [ ] Liste déroulante des Collections → Projets → Plans de test
- [ ] Aperçu du nombre de suites et cas de test
- [ ] Filtre par statut (Active, Inactive)
- [ ] Chargement asynchrone avec indicateur de progression

### US-04 : Extraction des résultats d'exécution
**En tant que** testeur,  
**Je veux** extraire les résultats de toutes les exécutions d'un plan,  
**Afin d'** avoir une vue complète des tests passés/échoués.

**Données extraites :**
- Résultats par cas de test (Passed/Failed/Blocked/Not Run)
- Commentaires et messages d'erreur
- Liens vers les bugs associés
- Captures d'écran attachées

### US-05 : Couverture des exigences
**En tant que** test manager,  
**Je veux** voir la couverture des exigences liées aux tests,  
**Afin de** mesurer la complétude des tests par rapport aux specs.

### US-06 : Historique d'exécution
**En tant que** test manager,  
**Je veux** voir l'évolution du taux de réussite sur les dernières runs,  
**Afin de** détecter les tendances de qualité.

---

## EPIC 3 — Métadonnées & Paramétrage

### US-07 : Saisie des métadonnées métier
**En tant que** testeur,  
**Je veux** remplir les 14 champs métier avant de générer le rapport,  
**Afin de** contextualiser le rapport pour les parties prenantes.

**Wireframe :**
```
┌─────────────────────────────────────────────┐
│  📋 Métadonnées du rapport                  │
├─────────────────────────────────────────────┤
│  Référence projet : [________________]      │
│  Numéro de change : [________________]      │
│  Contact IT       : [________________]      │
│  Contact métier   : [________________]      │
│  Domaine fonct.   : [________________]      │
│  Application      : [________________]      │
│  Version          : [________________]      │
│  Environnement    : [________________]      │
│  Périmètre        : [________________]      │
│  Date début       : [📅 ____________]      │
│  Date fin         : [📅 ____________]      │
│  Testeur(s)       : [________________]      │
│  Approbateur      : [________________]      │
│  Statut global    : [ ✅ Réussi     ▾]     │
│                                             │
│  💾 Sauvegarder comme modèle               │
└─────────────────────────────────────────────┘
```

### US-08 : Templates de métadonnées
**En tant que** testeur,  
**Je veux** sauvegarder et réutiliser des modèles de métadonnées,  
**Afin de** gagner du temps sur les rapports récurrents.

---

## EPIC 4 — Génération de rapports

### US-09 : Export PDF
**En tant que** testeur,  
**Je veux** générer un rapport PDF professionnel,  
**Afin de** le partager avec mon équipe et mes managers.

**Structure du PDF :**
1. Page de garde (logo, métadonnées, statut global)
2. Résumé exécutif (tableau KPIs)
3. Résultats par suite de test
4. Détail des cas échoués
5. Couverture des exigences
6. Historique d'exécution (graphique)
7. Bugs liés
8. Annexes

### US-10 : Export Excel
**En tant que** test manager,  
**Je veux** exporter les données brutes en Excel,  
**Afin de** faire mes propres analyses et pivots.

### US-11 : Export PowerPoint
**En tant que** test manager,  
**Je veux** générer une présentation PowerPoint de synthèse,  
**Afin de** la présenter en comité de pilotage.

### US-12 : Export HTML
**En tant que** testeur,  
**Je veux** générer un rapport HTML interactif,  
**Afin de** le partager via intranet avec des graphiques cliquables.

---

## EPIC 5 — Analyse avancée

### US-13 : Comparaison de plans de test
**En tant que** test manager,  
**Je veux** comparer deux plans de test (ex: v1.0 vs v1.1),  
**Afin de** voir la progression ou régression de qualité.

### US-14 : Alertes taux de réussite
**En tant que** test manager,  
**Je veux** être alerté visuellement quand le taux de réussite passe sous 80%,  
**Afin de** prendre des décisions rapides.

---

## EPIC 6 — Automatisation

### US-15 : Exports périodiques
**En tant que** test manager,  
**Je veux** configurer des exports automatiques (quotidiens/hebdomadaires),  
**Afin de** recevoir les rapports sans intervention manuelle.

### US-16 : Envoi email automatique
**En tant que** testeur,  
**Je veux** configurer l'envoi automatique des rapports par email,  
**Afin de** notifier les parties prenantes sans action manuelle.

### US-17 : Templates personnalisables
**En tant que** test manager,  
**Je veux** personnaliser l'apparence des rapports (logo, couleurs),  
**Afin de** respecter la charte graphique de mon organisation.
