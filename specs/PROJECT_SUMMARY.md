# TFSReporter — PROJECT SUMMARY
## Résumé Exécutif

---

## VISION

TFSReporter transforme les données brutes d'Azure DevOps en rapports de test professionnels en quelques clics, sans installation, sans configuration complexe, sans cloud.

---

## RÉSUMÉ TECHNIQUE

| Attribut | Valeur |
|----------|--------|
| Type | Application Windows desktop portable |
| Stack | Electron 28 + React 18 + Material-UI 5 |
| Cible | Azure DevOps Server 2022.1 on-premise |
| Auth | Personal Access Token (chiffré) |
| Exports | PDF, Excel, PowerPoint, HTML, JSON/XML |
| Contrainte | .exe unique < 150 MB, démarrage < 3s |
| Personas | Testeurs quotidiens + Test Managers |

---

## VALEUR AJOUTÉE

**Pour les testeurs :**
- Rapport PDF en 3 clics après chaque sprint
- 14 métadonnées métier pré-remplissables
- Pas de configuration serveur

**Pour les test managers :**
- Comparaison entre releases (v1.0 vs v1.1)
- Alertes automatiques si qualité < 80%
- Exports automatiques hebdomadaires par email
- Tableaux de bord avec métriques visuelles

---

## STATUT

🟢 **Phase 1 en cours** — Setup projet + Infrastructure  
⬜ Phase 2 — Data Layer  
⬜ Phase 3 — Exports  
⬜ Phase 4 — Features avancées  

---

## LIVRABLES ATTENDUS

1. `TFSReporter-Setup.exe` — installeur Windows
2. `TFSReporter-Portable.exe` — version portable
3. Documentation utilisateur (PDF)
4. Guide d'administration (PAT, configuration réseau)
