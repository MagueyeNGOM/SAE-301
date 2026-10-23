<?php

declare(strict_types=1);

namespace App\Controller;

use App\Core\Request;
use App\Core\Response;
use App\Model\OrderModel;
use App\Model\ProductModel;
use DomainException;

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

        $lignes  = [];
        $confirmation = [];
        $reserve = []; // quantité demandée par produit et taille
        $total   = 0.0;
        foreach ($demandes as $demande) {
            $produit = $this->produits->trouver($demande['slug']);

            if ($produit === null) {
                Response::erreur('Un article de votre panier n\'est plus disponible. Retirez-le puis réessayez.', 422);
            }

            // Chaque produit a toujours au moins une variante avec stock (OPT-B),
            // « Unique » pour ceux sans taille : un produit sans aucune variante
            // n'est pas une absence de contrainte, c'est une configuration invalide,
            // donc jamais commandable.
            if ($produit['tailles'] === []) {
                Response::erreur('« ' . $produit['nom'] . ' » n\'est plus disponible.', 422);
            }

            // La taille doit être l'une des variantes du produit, et en stock.
            $tailleId = $demande['tailleId'];
            $taille   = null;
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

            // STK-C : les flocages d'un même produit et d'une même taille partagent le stock.
            $cleReserve = $produit['id'] . '|' . $tailleId;
            $reserve[$cleReserve] = ($reserve[$cleReserve] ?? 0) + $demande['quantite'];
            if ($reserve[$cleReserve] > $taille['quantite']) {
                Response::erreur(
                    'Il ne reste que ' . $taille['quantite'] . ' exemplaire' . ($taille['quantite'] > 1 ? 's' : '')
                    . ' de la taille ' . $taille['libelle'] . ' de « ' . $produit['nom'] . ' ». Ajustez votre panier.',
                    422
                );
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
            $confirmation[] = [
                'slug' => $produit['slug'], 'nom' => $produit['nom'], 'prix' => $produit['prix'], 'image' => $produit['image'],
                'quantite' => $demande['quantite'], 'taille' => ['id' => $tailleId, 'libelle' => $taille['libelle']],
                'flocage' => $flocage, 'prixFlocage' => $prixFlocage,
            ];
        }

        $total  = round($total, 2);
        if ($total > 999999.99) {
            Response::erreur('Le montant maximal d’une commande est de 999 999,99 €. Réduisez votre panier.', 422);
        }
        $expected = $requete->corps()['totalAttendu'] ?? null;
        if ($expected !== null && ((!is_int($expected) && !is_float($expected)) || !is_finite((float) $expected))) {
            Response::erreur('Le montant du récapitulatif est invalide.', 422);
        }
        if ($expected !== null && round($expected * 100) !== round($total * 100)) {
            Response::erreur('Les prix ont changé. Vérifiez le nouveau récapitulatif avant de confirmer.', 409);
        }
        try {
            $numero = $this->commandes->creer((int) $_SESSION['utilisateur'], $lignes, $total);
        } catch (DomainException $e) {
            // Stock épuisé entre la vérification et l'enregistrement : rien n'a été enregistré.
            Response::erreur($e->getMessage(), 409);
        }

        Response::json(['commande' => ['numero' => $numero, 'total' => $total, 'articles' => count($lignes), 'lignes' => $confirmation]], 201);
    }
}
