# TFSReporter — CONSTITUTION
## Principes Architecturaux Immuables

---

## 1. IDENTITÉ DU PRODUIT

**TFSReporter** est une application Windows desktop portable permettant aux équipes de test de générer des rapports professionnels depuis Azure DevOps Server 2022.1 on-premise.

---

## 2. STACK TECHNOLOGIQUE (NON NÉGOCIABLE)

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Desktop runtime | **Electron** | Portable .exe, accès système |
| UI Framework | **React 18** | Composants réutilisables |
| UI Library | **Material-UI v5** | Design professionnel |
| State management | **Zustand** | Léger, simple |
| PDF export | **PDFKit** | Contrôle total du rendu |
| Excel export | **ExcelJS** | Xlsx natif |
| PowerPoint export | **PptxGenJS** | Pptx natif |
| Charts | **Chart.js** | Graphiques interactifs |
| HTTP client | **Axios** | Appels API ADO |
| Encryption | **electron-store + safeStorage** | PAT chiffré |

---

## 3. CONTRAINTES ABSOLUES

- ✅ **Un seul fichier .exe portable** — aucune installation requise
- ✅ **Taille < 150 MB** — déployable sans validation IT
- ✅ **Démarrage < 3 secondes** sur machine standard
- ✅ **PAT stocké chiffré** — jamais en clair sur disque
- ✅ **Fonctionnement 100% on-premise** — aucun cloud externe
- ✅ **Compatible Windows 10/11 64-bit**
- ❌ **Pas de backend serveur** — tout côté client Electron
- ❌ **Pas de base de données externe** — stockage local uniquement

---

## 4. PERSONAS CIBLES

**Sarah — Testeuse quotidienne**
- Génère des rapports après chaque sprint/release
- Veut un accès rapide, sans configuration complexe
- Besoin : export PDF en 3 clics

**Marc — Test Manager**
- Consulte les rapports hebdomadaires de son équipe
- Compare les plans de test entre releases
- Besoin : tableaux de bord avec métriques agrégées

---

## 5. MÉTADONNÉES MÉTIER OBLIGATOIRES (14 CHAMPS)

Tout rapport doit inclure :

1. Référence projet
2. Numéro de change
3. Contact IT
4. Contact métier
5. Domaine fonctionnel
6. Nom de l'application
7. Version de l'application
8. Environnement de test
9. Périmètre de test
10. Date de début des tests
11. Date de fin des tests
12. Testeur(s) responsable(s)
13. Approbateur
14. Statut global (Réussi / Échoué / En cours)

---

## 6. RÈGLES DE QUALITÉ

- Alerte automatique si taux de réussite < **80%**
- Comparaison possible entre 2 plans de test
- Exports périodiques automatisables
- Envoi email automatique des rapports
