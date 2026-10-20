# PIL-B — Gestion des commandes (admin)

Implémentée le 20/10/2026, vérifiée localement sur SQLite uniquement.
Déploiement, migrations MySQL et rendu navigateur restent à confirmer.

## Fonctionnement

- API (`AdminOrderController`, routes `/api/admin/commandes`, `/commande`,
  `/commandes/action`) : liste triable (date, statut, montant) et filtrable par
  statut, détail, action `suivant` ou `annuler` sur 1 à 50 commandes.
  Chaque commande d'un lot est traitée seule ; la réponse donne `ok` et un message par commande.
- Règles : en cours → disponible → retirée ; annulation possible tant que la commande
  n'est pas retirée, avec `confirmed: true` obligatoire côté serveur.
- `OrderModel::changerStatut` : une transaction (UPDATE conditionnel sur l'ancien statut,
  remise en stock par taille, ligne dans `journal_admin`).
- Front : `front/src/pages/admin/orders/` (liste P3-06, détail P3-07, confirmation
  avant annulation), données dans `front/src/data/admin-order.js`.

## Stock (début de STK-A)

- `OrderModel::creer` retire maintenant le stock par taille (UPDATE atomique
  `quantite >= :q`) ; un stock devenu insuffisant renvoie 409 et rien n'est enregistré.
- `commande.stock_decremente` vaut 1 pour les commandes créées ensuite ; les anciennes
  (valeur 0) n'ont rien retiré, leur annulation ne remet donc rien en stock.
- Restent à faire pour STK-A : journal des mouvements de stock, tests de commandes concurrentes.
- Si une taille est retirée d'un produit après la commande, sa remise en stock est ignorée.

## Migrations (à lancer une fois, dans l'ordre, avant de déployer le back)

1. `sql/migrations/pil-b-order-stock-flag.sql`
2. `sql/migrations/pil-b-admin-log.sql` (MySQL)

Sans la première, toute nouvelle commande échoue ; sans la seconde, le changement de statut échoue.

## Vérifications

- `PHP_BIN=C:/xampp/php/php.exe node tests/pil-b.mjs` : 57 contrôles réussis le 20/10/2026
  (accès, tri, transitions, annulation, stock, lots, journal, session client conservée).
- `gof-a`, `gof-b`, `gof-c` rejoués : réussis le 20/10/2026 (`gof-a` applique désormais
  la migration du drapeau de stock).
- `vite build` réussi. Non fait : rendu navigateur, responsive, comparaison Figma,
  W3C, Chrome/Edge/Firefox, MySQL réel. Pagination (« Page 1 / 2 » de la maquette) non réalisée.
