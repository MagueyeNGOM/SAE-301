<?php

declare(strict_types=1);

namespace App\Model;

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

    /**
     * Enregistre une commande « en cours » et ses lignes, puis renvoie son numéro.
     *
     * $lignes : chaque ligne porte produit_id, nom, prix et quantite, déjà lus
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
                'INSERT INTO commande (numero, utilisateur_id, total)
                 VALUES (:numero, :utilisateur, :total)'
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

            // La taille et le flocage ne sont pas encore proposés (taille_id
            // reste NULL, prix_flocage vaut 0 par défaut).
            $ligne = $this->pdo->prepare(
                'INSERT INTO ligne_commande (commande_id, produit_id, nom_produit, quantite, prix_unitaire)
                 VALUES (:commande, :produit, :nom, :quantite, :prix)'
            );
            foreach ($lignes as $l) {
                $ligne->execute([
                    'commande' => $id,
                    'produit'  => $l['produit_id'],
                    'nom'      => $l['nom'],
                    'quantite' => $l['quantite'],
                    'prix'     => number_format($l['prix'], 2, '.', ''),
                ]);
            }

            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }

        return $numero;
    }
}
