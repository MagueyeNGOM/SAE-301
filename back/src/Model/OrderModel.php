<?php

declare(strict_types=1);

namespace App\Model;

use DomainException;
use PDO;
use Throwable;

/**
 * Accès aux commandes (CMD-A).
 *
 * Aucune règle métier ici : seulement des requêtes.
 */
final class OrderModel
{
    /** Connexion à la base, fournie à la construction. */
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function count(): int
    {
        return (int) $this->pdo->query('SELECT COUNT(*) FROM commande')->fetchColumn();
    }

    /**
     * Enregistre une commande « en cours » et ses lignes, puis renvoie son numéro.
     *
     * $lignes : chaque ligne porte produit_id, nom, prix, quantite, taille_id,
     * flocage_nom, flocage_numero et prix_flocage, déjà lus
     * en base par le contrôleur. Nom et prix sont copiés dans la ligne : un
     * changement ultérieur du catalogue ne modifie pas la commande.
     *
     * Tout ou rien : si une insertion échoue, rien n'est enregistré.
     */
    public function creer(int $utilisateurId, array $lignes, float $total): string
    {
        $this->pdo->beginTransaction();

        try {
            // Verrouiller dans un ordre stable, avant les stocks et toute insertion.
            $ids = array_unique(array_column($lignes, 'produit_id'));
            sort($ids, SORT_NUMERIC);
            $lock = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : '';
            $query = $this->pdo->prepare('SELECT prix, prix_flocage FROM produit WHERE id = :id' . $lock);
            foreach ($ids as $productId) {
                $query->execute(['id' => $productId]);
                $current = $query->fetch();
                foreach ($lignes as $l) {
                    if ($l['produit_id'] != $productId) continue;
                    if (!$current || round((float) $current['prix'] * 100) !== round($l['prix'] * 100)
                        || ($l['flocage_nom'] !== null && ($current['prix_flocage'] === null || round((float) $current['prix_flocage'] * 100) !== round($l['prix_flocage'] * 100)))) {
                        throw new DomainException('Les prix ont changé. Vérifiez le nouveau récapitulatif avant de confirmer.');
                    }
                }
            }
            // Numéro provisoire aléatoire (la colonne est unique et obligatoire) :
            // le vrai numéro dérive de l'id, que MySQL n'attribue qu'à l'insertion.
            $commande = $this->pdo->prepare(
                'INSERT INTO commande (numero, utilisateur_id, total, stock_decremente)
                 VALUES (:numero, :utilisateur, :total, 1)'
            );
            $commande->execute([
                'numero'      => bin2hex(random_bytes(8)),
                'utilisateur' => $utilisateurId,
                'total'       => number_format($total, 2, '.', ''),
            ]);
            $id = (int) $this->pdo->lastInsertId();

            // L'id est unique : le numéro l'est donc aussi (OM-000123).
            $numero = sprintf('OM-%06d', $id);
            $this->pdo->prepare('UPDATE commande SET numero = :numero WHERE id = :id')
                ->execute(['numero' => $numero, 'id' => $id]);

            // taille_id et flocage valent NULL pour un produit sans taille ni flocage.
            $ligne = $this->pdo->prepare(
                'INSERT INTO ligne_commande (commande_id, produit_id, taille_id, nom_produit, quantite, prix_unitaire,
                                             flocage_nom, flocage_numero, prix_flocage)
                 VALUES (:commande, :produit, :taille, :nom, :quantite, :prix,
                         :flocage_nom, :flocage_numero, :prix_flocage)'
            );
            // Décrémentation atomique : la condition quantite >= :q évite un stock négatif
            // si deux commandes se croisent.
            $retrait = $this->pdo->prepare(
                'UPDATE stock SET quantite = quantite - :q
                 WHERE produit_id = :produit AND taille_id = :taille AND quantite >= :q2'
            );
            foreach ($lignes as $l) {
                if ($l['taille_id'] !== null) {
                    $retrait->execute(['q' => $l['quantite'], 'produit' => $l['produit_id'], 'taille' => $l['taille_id'], 'q2' => $l['quantite']]);
                    if ($retrait->rowCount() === 0) {
                        throw new DomainException('Le stock de « ' . $l['nom'] . ' » a changé : quantité insuffisante. Ajustez votre panier.');
                    }
                    $this->journaliserStock((int) $l['produit_id'], (int) $l['taille_id'], $id, 'commande', -(int) $l['quantite']);
                }
                $ligne->execute([
                    'commande' => $id,
                    'produit'  => $l['produit_id'],
                    'taille'   => $l['taille_id'],
                    'nom'      => $l['nom'],
                    'quantite' => $l['quantite'],
                    'prix'     => number_format($l['prix'], 2, '.', ''),
                    'flocage_nom'    => $l['flocage_nom'],
                    'flocage_numero' => $l['flocage_numero'],
                    'prix_flocage'   => number_format($l['prix_flocage'], 2, '.', ''),
                ]);
            }

            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }

        return $numero;
    }

    /** Ajoute un mouvement au journal de stock ; à appeler dans la transaction qui modifie le stock. */
    private function journaliserStock(int $produitId, int $tailleId, int $commandeId, string $type, int $quantite): void
    {
        $this->pdo->prepare(
            'INSERT INTO mouvement_stock (produit_id, taille_id, commande_id, type, quantite)
             VALUES (:produit, :taille, :commande, :type, :quantite)'
        )->execute(['produit' => $produitId, 'taille' => $tailleId, 'commande' => $commandeId, 'type' => $type, 'quantite' => $quantite]);
    }

    /** Dernières commandes d'un client (SUI-B), filtrées par utilisateur_id : jamais celles des autres. */
    public function recentesPourUtilisateur(int $utilisateurId, int $limite = 3): array
    {
        $requete = $this->pdo->prepare(
            'SELECT numero, statut, total, date_commande
               FROM commande
              WHERE utilisateur_id = :utilisateur
              ORDER BY date_commande DESC, id DESC
              LIMIT ' . $limite
        );
        $requete->execute(['utilisateur' => $utilisateurId]);

        return $requete->fetchAll();
    }

    /** Commandes de tous les clients, triées (date, statut ou montant) et filtrées par statut. */
    public function liste(string $tri, bool $croissant, ?string $statut): array
    {
        $colonne = ['statut' => 'c.statut', 'montant' => 'c.total'][$tri] ?? 'c.date_commande';
        $requete = $this->pdo->prepare(
            'SELECT c.id, c.numero, c.statut, c.total, c.date_commande, u.prenom, u.nom
             FROM commande c JOIN utilisateur u ON u.id = c.utilisateur_id
             WHERE (:statut IS NULL OR c.statut = :statut2)
             ORDER BY ' . $colonne . ($croissant ? ' ASC' : ' DESC') . ', c.id DESC'
        );
        $requete->execute(['statut' => $statut, 'statut2' => $statut]);

        return array_map(static fn (array $c): array => [
            'id'       => (int) $c['id'],
            'numero'   => $c['numero'],
            'statut'   => $c['statut'],
            'total'    => (float) $c['total'],
            'date'     => $c['date_commande'],
            'client'   => trim($c['prenom'] . ' ' . $c['nom']),
        ], $requete->fetchAll());
    }

    /** Nombre de commandes par statut. */
    public function compteurs(): array
    {
        $compteurs = ['en cours' => 0, 'disponible' => 0, 'retirée' => 0, 'annulée' => 0];
        foreach ($this->pdo->query('SELECT statut, COUNT(*) AS n FROM commande GROUP BY statut') as $ligne) {
            $compteurs[$ligne['statut']] = (int) $ligne['n'];
        }

        return $compteurs;
    }

    /** Revenus par jour des 7 derniers jours (aujourd'hui inclus), hors commandes annulées. */
    public function revenus7Jours(): array
    {
        // Le jour courant vient de la base, comme date_commande : pas de décalage de fuseau avec PHP.
        $aujourdhui = new \DateTimeImmutable((string) $this->pdo->query('SELECT DATE(CURRENT_TIMESTAMP)')->fetchColumn());
        $jours = [];
        for ($i = 6; $i >= 0; $i--) {
            $jours[$aujourdhui->modify("-$i day")->format('Y-m-d')] = 0.0;
        }

        $requete = $this->pdo->prepare(
            "SELECT DATE(date_commande) AS jour, SUM(total) AS revenu FROM commande
             WHERE statut <> 'annulée' AND date_commande >= :debut GROUP BY DATE(date_commande)"
        );
        $requete->execute(['debut' => array_key_first($jours)]);
        foreach ($requete as $ligne) {
            if (isset($jours[$ligne['jour']])) $jours[$ligne['jour']] = (float) $ligne['revenu'];
        }

        $revenus = [];
        foreach ($jours as $jour => $revenu) $revenus[] = ['jour' => $jour, 'revenu' => $revenu];
        return $revenus;
    }

    /** Les 5 produits les plus vendus (quantités), hors commandes annulées. */
    public function plusVendus(): array
    {
        $lignes = $this->pdo->query(
            "SELECT p.nom, SUM(l.quantite) AS ventes FROM ligne_commande l
             JOIN commande c ON c.id = l.commande_id JOIN produit p ON p.id = l.produit_id
             WHERE c.statut <> 'annulée' GROUP BY p.id, p.nom ORDER BY ventes DESC, p.nom LIMIT 5"
        )->fetchAll();
        foreach ($lignes as &$ligne) $ligne['ventes'] = (int) $ligne['ventes'];
        return $lignes;
    }

    /** Commande complète (client, lignes, options) ou null si elle n'existe pas. */
    public function detail(int $id): ?array
    {
        $requete = $this->pdo->prepare(
            'SELECT c.id, c.numero, c.statut, c.total, c.date_commande, c.date_retrait, u.prenom, u.nom, u.email, u.telephone
             FROM commande c JOIN utilisateur u ON u.id = c.utilisateur_id WHERE c.id = :id'
        );
        $requete->execute(['id' => $id]);
        $c = $requete->fetch();
        if ($c === false) {
            return null;
        }

        return [
            'id'      => (int) $c['id'],
            'numero'  => $c['numero'],
            'statut'  => $c['statut'],
            'total'   => (float) $c['total'],
            'date'    => $c['date_commande'],
            'retrait' => $c['date_retrait'],
            'client'  => ['nom' => trim($c['prenom'] . ' ' . $c['nom']), 'email' => $c['email'], 'telephone' => $c['telephone']],
            'lignes'  => $this->lignes($id),
        ];
    }

    /** Lignes d'une commande : nom et prix figés, taille et flocage choisis (CMD-A, OPT-A). */
    private function lignes(int $commandeId): array
    {
        $lignes = $this->pdo->prepare(
            'SELECT l.nom_produit, l.quantite, l.prix_unitaire, l.flocage_nom, l.flocage_numero, l.prix_flocage, t.libelle
             FROM ligne_commande l LEFT JOIN taille t ON t.id = l.taille_id
             WHERE l.commande_id = :id ORDER BY l.id'
        );
        $lignes->execute(['id' => $commandeId]);

        return array_map(static fn (array $l): array => [
            'nom'      => $l['nom_produit'],
            'taille'   => $l['libelle'],
            'quantite' => (int) $l['quantite'],
            'prix'     => (float) $l['prix_unitaire'],
            'flocage'  => $l['flocage_nom'] === null ? null : ['nom' => $l['flocage_nom'], 'numero' => (int) $l['flocage_numero'], 'prix' => (float) $l['prix_flocage']],
        ], $lignes->fetchAll());
    }

    /**
     * Historique d'un client (SUI-C) : ses commandes seulement, de la plus récente à la plus
     * ancienne, filtrées par statut et/ou par nombre de jours, une page à la fois.
     *
     * Renvoie ['commandes' => …, 'total' => nombre de commandes correspondantes].
     */
    public function historique(int $utilisateurId, ?string $statut, ?int $jours, int $page, int $parPage): array
    {
        $where  = 'utilisateur_id = :utilisateur';
        $params = ['utilisateur' => $utilisateurId];
        if ($statut !== null) {
            $where .= ' AND statut = :statut';
            $params['statut'] = $statut;
        }
        if ($jours !== null) {
            // Le jour courant vient de la base, comme date_commande : pas de décalage de fuseau avec PHP.
            $depuis = (new \DateTimeImmutable((string) $this->pdo->query('SELECT CURRENT_TIMESTAMP')->fetchColumn()))->modify("-$jours day");
            $where .= ' AND date_commande >= :depuis';
            $params['depuis'] = $depuis->format('Y-m-d H:i:s');
        }

        $nombre = $this->pdo->prepare('SELECT COUNT(*) FROM commande WHERE ' . $where);
        $nombre->execute($params);

        $liste = $this->pdo->prepare(
            'SELECT numero, statut, total, date_commande FROM commande WHERE ' . $where
            . ' ORDER BY date_commande DESC, id DESC LIMIT ' . $parPage . ' OFFSET ' . (($page - 1) * $parPage)
        );
        $liste->execute($params);

        return ['commandes' => $liste->fetchAll(), 'total' => (int) $nombre->fetchColumn()];
    }

    /** Une commande d'un client (SUI-C), ou null si elle n'existe pas ou appartient à un autre. */
    public function detailPourUtilisateur(int $utilisateurId, string $numero): ?array
    {
        $requete = $this->pdo->prepare(
            'SELECT id, numero, statut, total, date_commande, date_retrait
             FROM commande WHERE numero = :numero AND utilisateur_id = :utilisateur'
        );
        $requete->execute(['numero' => $numero, 'utilisateur' => $utilisateurId]);
        $c = $requete->fetch();
        if ($c === false) {
            return null;
        }

        return [
            'numero'  => $c['numero'],
            'statut'  => $c['statut'],
            'total'   => (float) $c['total'],
            'date'    => $c['date_commande'],
            'retrait' => $c['date_retrait'],
            'lignes'  => $this->lignes((int) $c['id']),
        ];
    }

    /**
     * Lignes d'une commande du client (SUI-A) confrontées au catalogue d'aujourd'hui, ou null si la
     * commande n'existe pas ou appartient à un autre. Nom, prix, flocage et stock sont ceux d'aujourd'hui,
     * jamais ceux de la commande ; taille et flocage choisis à l'époque sont conservés.
     * Chaque ligne a un statut : « ok », « ajustee » (quantité ramenée au stock) ou « indisponible ».
     */
    public function reorderLines(int $utilisateurId, string $numero): ?array
    {
        $requete = $this->pdo->prepare('SELECT id FROM commande WHERE numero = :numero AND utilisateur_id = :utilisateur');
        $requete->execute(['numero' => $numero, 'utilisateur' => $utilisateurId]);
        $commandeId = $requete->fetchColumn();
        if ($commandeId === false) {
            return null;
        }

        $lignes = $this->pdo->prepare(
            'SELECT l.quantite, l.taille_id, l.nom_produit, l.flocage_nom, l.flocage_numero,
                    p.slug, p.nom, p.prix, p.prix_flocage, p.image, t.libelle, s.quantite AS stock
             FROM ligne_commande l
             LEFT JOIN produit p ON p.id = l.produit_id
             LEFT JOIN taille t ON t.id = l.taille_id
             LEFT JOIN stock s ON s.produit_id = l.produit_id AND s.taille_id = l.taille_id
             WHERE l.commande_id = :id ORDER BY l.id'
        );
        $lignes->execute(['id' => $commandeId]);

        $restant = []; // stock restant par produit et taille, partagé entre les lignes (flocages différents)
        $resultat = [];
        foreach ($lignes->fetchAll() as $l) {
            $quantite = (int) $l['quantite'];
            $nom      = $l['nom'] ?? $l['nom_produit'];
            $ligne    = ['statut' => 'ok', 'message' => '', 'nom' => $nom, 'quantite' => $quantite];
            $raison   = null;

            if ($l['slug'] === null) {
                $raison = 'n\'est plus au catalogue';
            } elseif ($l['flocage_nom'] !== null && $l['prix_flocage'] === null) {
                $raison = 'ne se floque plus';
            } elseif ($l['taille_id'] !== null && ($l['stock'] === null || (int) $l['stock'] <= 0)) {
                $raison = $l['stock'] === null ? 'n\'existe plus dans la taille ' . $l['libelle'] : 'est épuisé en taille ' . $l['libelle'];
            }

            if ($raison === null && $l['taille_id'] !== null) {
                $cle = $l['slug'] . '|' . $l['taille_id'];
                $restant[$cle] ??= (int) $l['stock'];
                $accorde = min($quantite, $restant[$cle]);
                if ($accorde < 1) {
                    $raison = 'est épuisé en taille ' . $l['libelle'] . ' (stock déjà attribué à une autre ligne)';
                } else {
                    $restant[$cle] -= $accorde;
                    if ($accorde < $quantite) {
                        $ligne['statut']   = 'ajustee';
                        $ligne['message']  = '« ' . $nom . ' » (taille ' . $l['libelle'] . ') : il ne reste que ' . $accorde . ' exemplaire' . ($accorde > 1 ? 's' : '') . ', la quantité a été ajustée.';
                        $ligne['quantite'] = $accorde;
                    }
                }
            }

            if ($raison !== null) {
                $ligne['statut']  = 'indisponible';
                $ligne['message'] = '« ' . $nom . ' » ' . $raison . ' : il n\'a pas été ajouté.';
                $resultat[] = $ligne;
                continue;
            }

            $resultat[] = $ligne + [
                'slug'        => $l['slug'],
                'prix'        => (float) $l['prix'],
                'prixFlocage' => $l['prix_flocage'] === null ? 0.0 : (float) $l['prix_flocage'],
                'image'       => $l['image'],
                'taille'      => $l['taille_id'] === null ? null : ['id' => (int) $l['taille_id'], 'libelle' => $l['libelle'], 'stock' => (int) $l['stock']],
                'flocage'     => $l['flocage_nom'] === null ? null : ['nom' => $l['flocage_nom'], 'numero' => (int) $l['flocage_numero']],
            ];
        }

        return $resultat;
    }

    /**
     * Passe la commande de $ancien à $nouveau et l'inscrit au journal.
     * L'annulation remet en stock, par taille, ce que la commande avait retiré.
     *
     * Renvoie false si le statut a changé entre-temps : rien n'est modifié.
     * Les transitions autorisées sont vérifiées par le contrôleur.
     */
    public function changerStatut(int $id, string $ancien, string $nouveau, int $adminId): bool
    {
        $this->pdo->beginTransaction();

        try {
            $retrait = $nouveau === 'retirée' ? ', date_retrait = CURRENT_TIMESTAMP' : '';
            $maj = $this->pdo->prepare('UPDATE commande SET statut = :nouveau' . $retrait . ' WHERE id = :id AND statut = :ancien');
            $maj->execute(['nouveau' => $nouveau, 'id' => $id, 'ancien' => $ancien]);
            if ($maj->rowCount() === 0) {
                $this->pdo->rollBack();

                return false;
            }

            if ($nouveau === 'annulée') {
                // Une commande antérieure à PIL-B n'a rien retiré du stock : rien à remettre.
                $lignes = $this->pdo->prepare(
                    'SELECT l.produit_id, l.taille_id, l.quantite
                     FROM ligne_commande l JOIN commande c ON c.id = l.commande_id
                     WHERE l.commande_id = :id AND c.stock_decremente = 1 AND l.taille_id IS NOT NULL'
                );
                $lignes->execute(['id' => $id]);
                $mysql = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
                $remise = $this->pdo->prepare('INSERT INTO stock (produit_id, taille_id, quantite) VALUES (:produit, :taille, :q) '
                    . ($mysql ? 'ON DUPLICATE KEY UPDATE quantite = quantite + VALUES(quantite)' : 'ON CONFLICT(produit_id, taille_id) DO UPDATE SET quantite = quantite + excluded.quantite'));
                foreach ($lignes->fetchAll() as $l) {
                    $remise->execute(['q' => $l['quantite'], 'produit' => $l['produit_id'], 'taille' => $l['taille_id']]);
                    // Répare aussi une taille retirée avant la protection des commandes actives.
                    $this->journaliserStock((int) $l['produit_id'], (int) $l['taille_id'], $id, 'annulation', (int) $l['quantite']);
                }
            }

            $this->pdo->prepare(
                'INSERT INTO journal_admin (admin_id, commande_id, action, ancien_statut, nouveau_statut)
                 VALUES (:admin, :commande, :action, :ancien, :nouveau)'
            )->execute([
                'admin' => $adminId, 'commande' => $id, 'action' => $nouveau === 'annulée' ? 'annulation' : 'statut',
                'ancien' => $ancien, 'nouveau' => $nouveau,
            ]);

            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }

        return true;
    }
}
