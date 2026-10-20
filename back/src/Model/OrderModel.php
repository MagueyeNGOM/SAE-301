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

        $lignes = $this->pdo->prepare(
            'SELECT l.nom_produit, l.quantite, l.prix_unitaire, l.flocage_nom, l.flocage_numero, l.prix_flocage, t.libelle
             FROM ligne_commande l LEFT JOIN taille t ON t.id = l.taille_id
             WHERE l.commande_id = :id ORDER BY l.id'
        );
        $lignes->execute(['id' => $id]);

        return [
            'id'      => (int) $c['id'],
            'numero'  => $c['numero'],
            'statut'  => $c['statut'],
            'total'   => (float) $c['total'],
            'date'    => $c['date_commande'],
            'retrait' => $c['date_retrait'],
            'client'  => ['nom' => trim($c['prenom'] . ' ' . $c['nom']), 'email' => $c['email'], 'telephone' => $c['telephone']],
            'lignes'  => array_map(static fn (array $l): array => [
                'nom'      => $l['nom_produit'],
                'taille'   => $l['libelle'],
                'quantite' => (int) $l['quantite'],
                'prix'     => (float) $l['prix_unitaire'],
                'flocage'  => $l['flocage_nom'] === null ? null : ['nom' => $l['flocage_nom'], 'numero' => (int) $l['flocage_numero'], 'prix' => (float) $l['prix_flocage']],
            ], $lignes->fetchAll()),
        ];
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
                $remise = $this->pdo->prepare(
                    'UPDATE stock SET quantite = quantite + :q WHERE produit_id = :produit AND taille_id = :taille'
                );
                foreach ($lignes->fetchAll() as $l) {
                    $remise->execute(['q' => $l['quantite'], 'produit' => $l['produit_id'], 'taille' => $l['taille_id']]);
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
