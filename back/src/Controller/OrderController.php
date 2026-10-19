<?php

declare(strict_types=1);

namespace App\Controller;

use App\Core\Request;
use App\Core\Response;
use App\Model\OrderModel;
use App\Model\ProductModel;

/**
 * Validation de la commande (CMD-A).
 *
 * Le navigateur n'envoie que des slugs, des quantités, une taille et un
 * flocage : les noms et les prix (flocage compris) sont relus en base, jamais
 * pris dans la requête. Le client est celui de la
 * session.
 */
final class OrderController
{
    private const QUANTITE_MAX = 99;

    /** Les modèles qui interrogent la base, fournis à la construction. */
    private OrderModel $commandes;
    private ProductModel $produits;

    public function __construct(OrderModel $commandes, ProductModel $produits)
    {
        $this->commandes = $commandes;
        $this->produits  = $produits;
    }

    public function creer(Request $requete): void
    {
        if (!isset($_SESSION['utilisateur'])) {
            Response::erreur('Connectez-vous pour valider votre commande.', 401);
        }

        $recues = $requete->corps()['lignes'] ?? null;

        if (!is_array($recues) || $recues === []) {
            Response::erreur('Votre panier est vide.', 422);
        }
        if (count($recues) > 50) {
            Response::erreur('Votre panier contient trop d\'articles.', 422);
        }

        // Une ligne par produit, taille et flocage : deux lignes identiques sont additionnées.
        $demandes = [];
        foreach ($recues as $ligne) {
            $ligne    = is_array($ligne) ? $ligne : [];
            $slug     = is_string($ligne['slug'] ?? null) ? $ligne['slug'] : '';
            $quantite = $ligne['quantite'] ?? null;
            $tailleId = $ligne['tailleId'] ?? null;
            $flocage  = $ligne['flocage'] ?? null;

            if ($slug === '' || !is_int($quantite) || $quantite < 1 || $quantite > self::QUANTITE_MAX) {
                Response::erreur('Une quantité de votre panier n\'est pas valide.', 422);
            }
            if ($tailleId !== null && !is_int($tailleId)) {
                Response::erreur('Une taille de votre panier n\'est pas valide.', 422);
            }
            if ($flocage !== null) {
                $nom    = is_array($flocage) && is_string($flocage['nom'] ?? null) ? trim($flocage['nom']) : '';
                $numero = is_array($flocage) ? ($flocage['numero'] ?? null) : null;

                // Mêmes règles que le formulaire de la fiche produit et que la base (VARCHAR(12), 0 à 99).
                if (preg_match('/^[\p{L} \'-]{1,12}$/u', $nom) !== 1 || !is_int($numero) || $numero < 0 || $numero > 99) {
                    Response::erreur('Un flocage de votre panier n\'est pas valide (nom de 1 à 12 lettres, numéro de 0 à 99).', 422);
                }
                $flocage = ['nom' => mb_strtoupper($nom), 'numero' => $numero];
            }

            $cle = $slug . '|' . ($tailleId ?? '') . '|' . ($flocage['nom'] ?? '') . '|' . ($flocage['numero'] ?? '');
            if (isset($demandes[$cle])) {
                $demandes[$cle]['quantite'] = min($demandes[$cle]['quantite'] + $quantite, self::QUANTITE_MAX);
            } else {
                $demandes[$cle] = ['slug' => $slug, 'quantite' => $quantite, 'tailleId' => $tailleId, 'flocage' => $flocage];
            }
        }

        $lignes = [];
        $total  = 0.0;
        foreach ($demandes as $demande) {
            $produit = $this->produits->trouver($demande['slug']);

            if ($produit === null) {
                Response::erreur('Un article de votre panier n\'est plus disponible. Retirez-le puis réessayez.', 422);
            }

            // La taille doit être l'une de celles du produit, et en stock.
            $tailleId = $demande['tailleId'];
            if ($produit['tailles'] === []) {
                if ($tailleId !== null) {
                    Response::erreur('« ' . $produit['nom'] . ' » ne se commande pas par taille.', 422);
                }
            } else {
                $taille = null;
                foreach ($produit['tailles'] as $t) {
                    if ($t['id'] === $tailleId) {
                        $taille = $t;
                    }
                }
                if ($taille === null) {
                    Response::erreur('Choisissez une taille pour « ' . $produit['nom'] . ' ».', 422);
                }
                if ($taille['quantite'] < 1) {
                    Response::erreur('La taille ' . $taille['libelle'] . ' de « ' . $produit['nom'] . ' » est épuisée.', 422);
                }
            }

            // Le prix du flocage vient de la base : le produit doit en proposer un.
            $flocage     = $demande['flocage'];
            $prixFlocage = 0.0;
            if ($flocage !== null) {
                if ($produit['prixFlocage'] === null) {
                    Response::erreur('« ' . $produit['nom'] . ' » ne peut pas être floqué.', 422);
                }
                $prixFlocage = $produit['prixFlocage'];
            }

            $lignes[] = [
                'produit_id'     => $produit['id'],
                'nom'            => $produit['nom'],
                'prix'           => $produit['prix'],
                'quantite'       => $demande['quantite'],
                'taille_id'      => $tailleId,
                'flocage_nom'    => $flocage['nom'] ?? null,
                'flocage_numero' => $flocage['numero'] ?? null,
                'prix_flocage'   => $prixFlocage,
            ];
            $total += ($produit['prix'] + $prixFlocage) * $demande['quantite'];
        }

        $total  = round($total, 2);
        $numero = $this->commandes->creer((int) $_SESSION['utilisateur'], $lignes, $total);

        Response::json(['commande' => ['numero' => $numero, 'total' => $total, 'articles' => count($lignes)]], 201);
    }
}
