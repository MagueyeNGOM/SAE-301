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
- L'onglet « Mes commandes » et les boutons « Détail » / « Voir le détail » de la
  maquette attendent SUI-C.
- Test : `PHP_BIN=C:/xampp/php/php.exe node tests/sui-b.mjs` (PHP de XAMPP, pas dans le PATH).
- 21/10/2026, local : test API 24/24 OK ; affichage vérifié (desktop, mobile 375 px,
  sans débordement) avec une API simulée ; build front OK. Non fait : W3C,
  autres navigateurs, essai sur le serveur cible. `tests/pil-b.mjs` échoue
  (table `mouvement_stock` absente de sa fixture, STK-A en cours) : sans lien avec SUI-B.

## Vérifications

- Tester la persistance du panier.
- Tester les quantités et les totaux.
- Tester les accès non authentifiés.
- Tester la commande complète.
- Vérifier les données enregistrées.