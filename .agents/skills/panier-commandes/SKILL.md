---
name: panier-commandes
description: Travailler sur le panier, l'authentification client et la validation des commandes.
---

# Panier et commandes

US concernées : CMD-B, CMD-C, CMD-A.

Ces fonctionnalités sont déclarées implémentées.

## Panier

- Conserver la persistance avec localStorage.
- Permettre l'ajout et la suppression d'articles.
- Permettre la modification des quantités.
- Recalculer automatiquement les totaux.
- Préserver les options des produits.
- Respecter les limites de stock.

## Authentification

- Conserver l'inscription et la connexion.
- Conserver la déconnexion.
- Protéger les sessions.
- Utiliser un hash sécurisé des mots de passe.
- Régénérer la session à la connexion.
- Garder des erreurs compréhensibles en français.

## Commandes

- Exiger une connexion avant validation.
- Présenter un récapitulatif avant confirmation.
- Enregistrer les commandes en base de données.
- Générer un numéro unique.
- Conserver les prix au moment de la commande.
- Conserver les options sélectionnées.
- Utiliser le statut initial « en cours ».
- Vider le panier après validation réussie.
- Afficher une confirmation claire.
- Ne jamais intégrer de paiement en ligne.

## Espace personnel (SUI-B)

- Maquettes Figma P2-06 (aperçu) et P2-09 (profil). Pages `/compte` et
  `/compte/profil` (`front/src/pages/compte/`, `compte-profil/`), onglets dans
  `ui/onglets-compte` ; lien depuis le nom dans l'en-tête.
- API : `GET /api/compte`, `POST /api/compte/profil` (nom, email et, si `nouveau`
  est rempli, mot de passe avec `actuel` exigé). `AuthController`,
  `UserModel::parId/modifierProfil/modifierMdp`, `OrderModel::recentesPourUtilisateur`.
- L'identité vient de `$_SESSION` (rôle `client`), jamais de la requête ; 401 sinon.
- Tout est validé avant écriture ; changement de mot de passe : session régénérée.
- `AuthController` reçoit `OrderModel` (voir `back/index.php`).
- Test : `PHP_BIN=C:/xampp/php/php.exe node tests/sui-b.mjs` (PHP de XAMPP, pas dans le PATH).
- 21/10/2026, local : test API 24/24 OK ; affichage vérifié (desktop, mobile 375 px,
  sans débordement) avec une API simulée ; build front OK. Non fait : W3C,
  autres navigateurs, essai sur le serveur cible. `tests/pil-b.mjs` échoue
  (table `mouvement_stock` absente de sa fixture, STK-A en cours) : sans lien avec SUI-B.

## Historique des commandes (SUI-C)

- Maquettes Figma P2-07 (liste) et P2-08 (détail). Pages `/compte/commandes` et
  `/compte/commandes/:numero` (`front/src/pages/compte-commandes/`, `compte-commande/`) ;
  onglet « Mes commandes » dans `ui/onglets-compte`. Affichage des statuts partagé
  avec `/compte` dans `front/src/lib/commande.js`. Pagination : `ui/pagination` réutilisé.
- API : `GET /api/compte/commandes?statut=&periode=30&page=` (6 par page, date décroissante ;
  statut ou période inconnus : 422) et `GET /api/compte/commande?numero=` (404 si la commande
  n'est pas celle du client). `AuthController::orders/order`,
  `OrderModel::historique/detailPourUtilisateur/lignes`. Le détail client n'expose ni email ni téléphone.
- Filtres : puces statut (une seule) + « 30 derniers jours », cumulables.
- Hors périmètre : « Commander à nouveau » (SUI-A) ; pas d'image produit dans le détail.
- Test : `PHP_BIN=C:/xampp/php/php.exe node tests/sui-c.mjs`.
- Vérification du 21/10/2026, en local (rien sur le serveur cible) :
  - `tests/sui-c.mjs` 22/22 ; régressions : gof-b 38, gof-c 47, pil-a 9, sui-b 24 OK.
    `gof-a.mjs` et `pil-b.mjs` échouent : leur fixture SQLite n'a pas la table `mouvement_stock`
    (STK-A), sans lien avec SUI-C.
  - Vraie pile : MariaDB 10.4 temporaire (import.sql + migrations) + PHP + front construit.
    Vraies commandes CMD-A (flocage), pagination, filtres, statuts admin, prix figés, injections SQL
    refusées (422/404), cloisonnement Alice/Bob : tout OK.
  - Navigateur, parcours complet (connexion, liste, filtres, pages, détail, commande d'un autre
    client) : Chrome 155, Edge 155 et Firefox 156 OK, sans erreur console.
  - W3C : validateur Nu, 0 erreur sur le HTML rendu de `/compte`, de la liste et du détail.
    Validateur CSS : 42 erreurs, toutes issues de Tailwind v4 (`@property` x40, `margin-trim`,
    variable de dégradé) ; aucune ne vient du code SUI-C.
  - Responsive : 375, 768 et desktop sans débordement ; rendu conforme à P2-07 et P2-08.
  - Reste : essai sur le serveur cible (MySQL de l'IUT).

## Vérifications

- Tester la persistance du panier.
- Tester les quantités et les totaux.
- Tester les accès non authentifiés.
- Tester la commande complète.
- Vérifier les données enregistrées.