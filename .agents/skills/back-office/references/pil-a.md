# PIL-A — Statistiques (admin)

Implémentée le 20/10/2026, vérifiée localement sur SQLite uniquement.
Déploiement et contrôle sur MySQL réel restent à confirmer. Aucune migration.

## Fonctionnement

- API : `GET /api/admin/stats` (`StatsController`, `requireAdmin`, réponse `no-store`),
  enrichie sans casser le tableau de bord GOF-B (`total`, `orders` conservés) :
  `compteurs` (PIL-B), `revenus` (7 jours, aujourd'hui inclus), `plusVendus` (top 5),
  `stocks` (total par produit), `alertes` (tailles au seuil ou en dessous).
- Revenus et ventes excluent les commandes annulées. Le jour courant est lu en base
  (`SELECT DATE(CURRENT_TIMESTAMP)`) pour rester aligné sur `date_commande`.
- Alertes par taille, avec `seuil_stock` du produit sinon le seuil de `config.php`
  (STK-B regarde, lui, le stock total du produit).
- Front : `front/src/pages/admin/stats/` (maquette Figma P3-08, nœud 35:491),
  graphiques en barres HTML/Tailwind sans bibliothèque, valeurs écrites en texte.
- Export : CSV généré côté navigateur depuis les données chargées (BOM UTF-8, `;`,
  cellules commençant par `= + - @` neutralisées).

- Espacements et rayon via tokens (`category-section` 22 px, `--radius-admin-chart` 10 px).
- `lib/api-request.js` traduit une coupure réseau en `ErreurApi` française (statut 0)
  pour tout le site, au lieu de « Failed to fetch ».

## Vérifications du 20/10/2026 (verifier-us, locales)

- `PHP_BIN=C:/xampp/php/php.exe node tests/pil-a.mjs` : 9 contrôles réussis ;
  `pil-b`, `gof-a`, `gof-b`, `gof-c` réussis (fixture `gof-b` aligné sur le vrai schéma).
- MySQL 8.4.7 XAMPP, base jetable (`import.sql` + migrations, `ONLY_FULL_GROUP_BY`) :
  requêtes des stats correctes (annulées et commandes > 7 jours exclues).
- `npm run build` sans avertissement. W3C Nu sur le HTML rendu : 0 message. W3C CSS :
  42 erreurs, toutes des faux positifs Tailwind v4 (`@property`, `margin-trim`).
- Scénario navigateur (CDP Chrome, Edge ; BiDi Firefox 156) : accès direct sans session,
  connexion vers `/admin/statistiques`, panne API puis « Réessayer », état vide,
  export CSV, déconnexion puis 401 ; 375/768/1200 px sans défilement horizontal.
- Scripts de démo (API SQLite + Vite proxifié) : à recréer dans le scratchpad, non conservés.
- Non fait : serveur cible (déploiement back, données réelles).
