# Boutique OM — SAÉ 3.01

## Projet
Site click & collect de la boutique Olympique de Marseille.
Catalogue, catégories, fiches produit, options, panier, compte client,
commandes à retirer en boutique, gestion des stocks et back-office `/admin`.
Aucun paiement en ligne. Base de code fournie : conserver son architecture.

## Règles de travail
- Répondre en français, brièvement et simplement, résultat d'abord.
- Expliquer les points importants avec des mots compréhensibles.
- Ne coder que sur demande explicite « fais ».
- Avant de coder, proposer un plan court et attendre sa validation.
- Ne modifier que ce qui est demandé ; lire uniquement les fichiers utiles.
- Préserver les fonctionnalités existantes et éviter les régressions.
- Noms de code en anglais, commentaires en français.
- Respecter la charte OM, le responsive et les règles de sécurité.
- Ne jamais inventer un résultat de test.
- Git est géré par Mag : aucune commande Git (commit, push, merge, etc.).
- Avant chaque tâche, consulter uniquement les règles
  pertinentes dans `.agents/rules/`.
- Utiliser `nouvelle-us` au démarrage d'une US.
- Utiliser `verifier-us` pour sa validation.

## Avancement des user stories
État déclaré au 20/10/2026 : implémentées, validation finale non garantie.

### Réalisées (11 US)
- DEC-B : catalogue ; DEC-C : fiches produit ; DEC-A : catégories.
- CMD-B : panier ; CMD-C : authentification ; CMD-A : commandes.
- OPT-C : options ; OPT-B : variantes ; OPT-A : options dans les commandes.
- STK-B : affichage des stocks ; STK-C : limites de stock.

### À réaliser (ordre du README.md)
**Étape 4 — Gérer l'offre**
- GOF-B : back-office `/admin`, authentification et accès sécurisés.
- GOF-C : création, modification et suppression des catégories.
- GOF-A : gestion des produits, images, prix, stocks et options.

**Étape 5 — Piloter l'activité**
- PIL-B : gestion des commandes, statuts, annulations et journal admin.
- PIL-A : statistiques des ventes, commandes et stocks, export.

**Étape 6 — Finaliser les stocks**
- STK-A : décrémentation et restauration automatiques du stock
  par variante, transactions et journal des mouvements.

**Étape 7 — Suivre les achats**
- SUI-B : espace personnel et modification du profil.
- SUI-C : historique, détails et filtres des commandes.
- SUI-A : recommander une ancienne commande avec contrôle du stock.

## Développement des US
- Utiliser le skill `nouvelle-us` pour préparer une US.
- Lire ses dépendances dans `README.md`.
- Lire ses critères détaillés dans `docs/user-stories.md` si disponible.
- Sinon, demander le sujet ou les critères manquants.
- Examiner le code existant avant toute modification.
- Réutiliser les fonctions, composants et modèles déjà présents.
- Ne pas considérer STK-A comme réalisée.
- Attendre « fais » avant de développer.

## Vérification
- Utiliser le skill `verifier-us` en fin d'US.
- Respecter la Definition of Done du sujet.
- Vérifier fonctionnement, W3C, responsive, sécurité et navigateurs.
- Signaler les vérifications impossibles, sans inventer de résultats.

## Références
- `README.md` : ordre et dépendances des US.
- `.agents/rules/metier.md` : règles métier.
- `.agents/rules/charte-om.md` : identité graphique.
- `.agents/rules/securite.md` : sécurité et accès.
- `.agents/skills/nouvelle-us/SKILL.md` : préparation des US.
- `.agents/skills/verifier-us/SKILL.md` : contrôles de fin d'US.


## Maquettes Figma

Maquettes de référence pour les interfaces de la boutique OM :

- [Maquette 1](https://www.figma.com/design/O7MtemKsP8zw6wSXpBU5Hb/Untitled?node-id=4-2)
- [Maquette 2](https://www.figma.com/design/O7MtemKsP8zw6wSXpBU5Hb/Untitled?node-id=4-3)
- [Maquette 3](https://www.figma.com/design/O7MtemKsP8zw6wSXpBU5Hb/Untitled?node-id=4-4)

Pour toute US touchant à l'interface :
- Consulter les maquettes pertinentes via Figma MCP.
- Respecter les composants, variables, couleurs et espacements.
- Adapter les maquettes au mobile, tablette et desktop.
- Réutiliser les composants existants du projet.
- Comparer le rendu final aux maquettes.
- Si Figma est inaccessible, le signaler sans inventer le design.
- Ne jamais modifier les maquettes Figma.


## Fin de tâche
Résumer : travail effectué, tests réalisés, problèmes et reste à faire.
