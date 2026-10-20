---
name: verifier-us
description: Vérifier les critères d'acceptation et la Definition of Done d'une US de la SAÉ 3.01.
---

# Vérifier une user story

Exécuter les vérifications possibles sans
demander à l'utilisateur de les faire à la
place de l'agent.

Ne jamais inventer un résultat de test.

## 1. Fonctionnement

- Vérifier les critères d'acceptation de l'US.
- Tester le scénario utilisateur complet.
- Tester les erreurs et les cas limites.
- Vérifier l'absence de régression.

## 2. Build

- Exécuter npm run build dans front/.
- Vérifier les erreurs et avertissements.
- Signaler tout problème rencontré.

## 3. Qualité HTML et CSS

- Vérifier le HTML réellement rendu.
- Utiliser le validateur Nu du W3C.
- Vérifier le CSS ou Tailwind CSS compilé avec le validateur W3C.
- Distinguer erreurs réelles et faux positifs
  éventuels liés à Tailwind.
- Ne jamais annoncer une validation W3C
  sans résultat du validateur.

## 4. Interface

- Respecter les variables de la charte OM.
- Vérifier les labels et les textes alternatifs.
- Contrôler le responsive sur :
  - mobile ;
  - tablette ;
  - desktop.
- Vérifier le rendu avec la maquette Figma.

## 5. Formulaires et sécurité

- Vérifier les validations client et serveur.
- Vérifier les messages d'erreur en français.
- Tester les requêtes incorrectes côté serveur.
- Vérifier les protections des pages privées.
- Vérifier les règles de securite.md.

## 6. Navigateurs

Tester sur trois navigateurs différents :
- Chrome ;
- Edge ;
- Firefox.

Utiliser les navigateurs réellement disponibles.
Tester les pages et états concernés par l'US.

Si un navigateur est absent, essayer un autre
navigateur installé.

Si trois navigateurs ne sont pas disponibles,
signaler précisément cette limitation.

## 7. Compte rendu

Présenter brièvement :
- VALIDÉ : tests exécutés avec succès.
- ÉCHEC : problèmes réellement constatés.
- NON VÉRIFIÉ : tests impossibles et raisons.

Ne jamais déclarer une US terminée
si ses critères obligatoires ne sont pas validés.

Conserver les informations utiles aux prochaines tâches dans le skill de domaine
concerné, avec les résultats détaillés et datés dans ses références si nécessaire.
Ne pas créer de compte rendu dans `docs/` sauf demande explicite, et ne pas
présenter une ancienne validation comme un test effectué pendant la tâche actuelle.

Ne modifier le code que si l'utilisateur
a explicitement demandé de le faire.
