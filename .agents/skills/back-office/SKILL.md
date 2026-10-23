---
name: back-office
description: Travailler sur l'accès administrateur, les catégories et les produits dans /admin de la Boutique OM (GOF-B, GOF-C, GOF-A), leurs migrations et leurs tests.
---

# Administration de la boutique

GOF-B, GOF-C et GOF-A sont implémentées et vérifiées localement au 20/10/2026.
Le déploiement et les vérifications sur le serveur cible restent à confirmer.
Les exigences de l'US viennent de `docs/user-stories.md` ; le README décrit
encore le starter films. Vérifier les dépendances dans le code et les critères.

## Choisir la référence utile

- Accès, sessions, tableau de bord et compte admin de test :
  [GOF-B](references/gof-b.md).
- Création, édition et suppression des catégories, migration des descriptions :
  [GOF-C](references/gof-c.md).
- Produits, variantes, seuils, images, PHP GD et stockage persistant :
  [GOF-A](references/gof-a.md).
- Gestion des commandes admin (PIL-B), statuts, annulation, journal, début de la
  décrémentation du stock : [PIL-B](references/pil-b.md).
- Statistiques (PIL-A), revenus 7 jours, meilleures ventes, stocks, alertes, export
  CSV : [PIL-A](references/pil-a.md).

Lire uniquement les références nécessaires. Elles conservent les procédures et
les résultats historiques ; leurs tests réussis ne remplacent pas une validation
du code actuel. Actualiser la référence concernée après un changement validé.

## Préserver l'existant

- Conserver l'API JSON PHP en routage / contrôleur / modèle et les sections admin
  du front dans `front/src/pages/admin/`, avec les composants et classes Tailwind.
- Réutiliser les sessions indépendantes `OMADMINSESSID` et `PHPSESSID`, le contrôle
  des droits côté serveur et les protections des requêtes admin. La déconnexion
  admin doit conserver la session client et le panier.
- Garder l'en-tête bleu, le lien « Accueil boutique » et la navigation existante.
  Consulter le parcours Figma Administrateur et les écrans utiles, sans les modifier.
- Préserver les slugs existants, les liens publics, les options, le stock par
  variante et les prix et options déjà enregistrés dans les commandes.
- Bloquer la suppression d'une catégorie contenant des produits ou d'un produit
  présent dans une commande, y compris côté serveur.
- Conserver les migrations additives de `sql/migrations/`. Ne pas réimporter
  `sql/import.sql` sur une base existante : ce fichier supprime les tables.
- Le front Vite utilise l'API distante par proxy : un build local ne déploie ni
  le back ni les migrations. Ne pas confondre validation locale et serveur cible.
- Conserver les images ajoutées dans `back/storage/product-images/`, hors du build,
  avec leurs contrôles et leur réencodage. Ne pas supprimer ce dossier au déploiement.
- STK-A (journal `mouvement_stock`, stock décrémenté/restauré par `OrderModel`) est
  décrite dans `gestion-stocks`. Les transactions de sauvegarde d'un produit ne la prouvent pas.

## Vérifier les changements concernés

- Utiliser `verifier-us` pour la validation et les tests `tests/gof-b.mjs`,
  `tests/gof-c.mjs`, `tests/gof-a.mjs` selon la portée et les régressions possibles.
- Ces tests utilisent SQLite temporaire ; vérifier les migrations MySQL et les
  droits/GD du serveur cible séparément lorsqu'ils font partie de la tâche.
- Préserver les données et comptes existants. Ne pas recréer ni remplacer le
  compte admin fonctionnel pour les besoins d'un test.
- Pour un changement d'interface, vérifier les états d'erreur, les accès directs,
  le responsive, Figma, le HTML rendu et les navigateurs requis par la DoD.

## Correctifs du 22/10/2026

Révisions des stocks, prix, variantes, catalogue et optimisations : [référence partagée](references/corrections-audit-2026-10-22.md).
