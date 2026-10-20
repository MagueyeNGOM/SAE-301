---
name: nouvelle-us
description: Préparer une nouvelle user story de la SAÉ 3.01 avant son développement.
---

# Démarrer une user story

Utiliser ce skill lorsque l'utilisateur annonce
qu'il commence une nouvelle US.

## Étapes

1. Identifier le code et l'objectif de l'US.
2. Lire ses critères d'acceptation et sa DoD.
3. Consulter README.md pour les dépendances.
4. Signaler toute dépendance non confirmée.
5. Lire le skill de domaine pertinent dans `.agents/skills/`, puis uniquement
   les fichiers utiles. Pour GOF-B, GOF-C ou GOF-A, utiliser
   [back-office](../back-office/SKILL.md) et seulement ses références nécessaires.
6. Identifier les fonctionnalités déjà réalisées
   qui pourraient être affectées.
7. Donner un plan simple avec :
   - l'objectif de l'US ;
   - les fichiers à créer ou modifier ;
   - les fonctionnalités à préserver ;
   - les vérifications nécessaires.
   - Si l'US concerne l'interface, consulter les maquettes
  Figma correspondantes avant de proposer le plan.
8. Attendre la validation et l'instruction
   explicite « fais » avant de coder.

## Pendant le développement

- Respecter la structure existante.
- Suivre les conventions du projet.
- Ne pas modifier les autres US inutilement.
- Préserver le fonctionnement existant.
- Respecter les règles métier et de sécurité.

## Après le développement

- Exécuter les vérifications possibles.
- Signaler les tests non effectués.
- Utiliser le skill verifier-us.
- Mettre à jour le skill de domaine avec les informations durables du travail
  réalisé. Si aucun skill ne couvre ce domaine, en créer un dans `.agents/skills/`.
  Garder les procédures détaillées et résultats datés utiles dans ses références,
  sans créer de compte rendu dans `docs/` sauf demande explicite.
- Ne jamais effectuer d'opération Git.
