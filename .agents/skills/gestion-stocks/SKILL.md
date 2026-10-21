---
name: gestion-stocks
description: Travailler sur l'affichage des disponibilités et les contraintes de stock, notamment par variante.
---

# Disponibilité et contraintes de stock

US implémentées déclarées :
- STK-B : affichage des stocks.
- STK-C : contraintes de stock.

US implémentée, validation finale non garantie :
- STK-A : mise à jour automatique des stocks.

## Affichage

- Afficher l'état de disponibilité des produits.
- Utiliser les états :
  - En stock.
  - Bientôt épuisé.
  - Épuisé.
- Utiliser un seuil configurable pour stock faible.
- Différencier visuellement les états.
- Respecter le stock de chaque variante.

## Contraintes

- Empêcher l'ajout d'un produit épuisé.
- Limiter la quantité au stock disponible.
- Afficher des erreurs claires en français.
- Ajuster les quantités du panier si nécessaire.
- Vérifier la disponibilité avant l'ajout.
- Revérifier le stock à la validation.
- Appliquer les contraintes par variante.
- Contrôler côté client et côté serveur.

## STK-A (mise à jour automatique)

Implémentée le 21/10/2026, vérifiée localement sur SQLite uniquement ; MySQL réel
et serveur cible restent à confirmer.

- `OrderModel::creer` retire le stock par taille et `changerStatut('annulée')` le remet,
  chacun dans sa transaction (début fait avec PIL-B, voir `../back-office/references/pil-b.md`).
- Journal : table `mouvement_stock` (migration `sql/migrations/stk-a-stock-movement.sql`,
  à lancer avant de déployer le back, sinon toute commande échoue). Une ligne par taille :
  `commande` (quantité négative) ou `annulation` (positive). Pas d'historique avant la migration.
- Pas de double décrémentation ni restauration : UPDATE conditionnel sur l'ancien statut
  et `commande.stock_decremente`. Produit sans taille : pas de stock géré.
- Le test dédié `tests/stk-a.mjs` et la table `mouvement_stock` dans les fixtures `pil-a`, `pil-b`,
  `gof-a` ont été supprimés à la demande de l'utilisateur (21/10/2026) : ces trois tests créent des
  commandes et échouent désormais sans cette table ; ils ne sont plus rejouables tels quels.
- verifier-us du 21/10/2026 (avant cette suppression) : tests `stk-a`, `pil-b`, `pil-a`, `gof-a`, `gof-b`,
  `gof-c` réussis ; `npm run build` sans avertissement. MariaDB 10.4.32 (XAMPP, InnoDB), base jetable
  (`import.sql` + migrations) : migration `stk-a` appliquée ; 3 essais de 2 commandes
  simultanées sur la dernière unité → une seule réussit, stock 0, 1 mouvement ; double annulation
  simultanée → une seule remise, journal `commande -1` puis `annulation +1`.
- Non fait : MySQL 8 (seule MariaDB testée), migration sur la base cible, W3C/responsive/navigateurs
  (aucun changement de front).

## Vérifications

Tester :
- Stock disponible.
- Stock faible.
- Stock nul.
- Quantité supérieure au stock.
- Changement de disponibilité.
- Variante épuisée.
- Refus d'une quantité invalide côté serveur.