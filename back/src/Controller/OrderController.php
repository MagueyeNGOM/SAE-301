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
 * Le navigateur n'envoie que des slugs et des quantités : les noms et les prix
 * sont relus en base, jamais pris dans la requête. Le client est celui de la
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

        // Une ligne par produit : deux lignes du même slug sont additionnées.
        $quantites = [];
        foreach ($recues as $ligne) {
            $slug     = is_array($ligne) && is_string($ligne['slug'] ?? null) ? $ligne['slug'] : '';
            $quantite = is_array($ligne) ? ($ligne['quantite'] ?? null) : null;

            if ($slug === '' || !is_int($quantite) || $quantite < 1 || $quantite > self::QUANTITE_MAX) {
                Response::erreur('Une quantité de votre panier n\'est pas valide.', 422);
            }

            $quantites[$slug] = min(($quantites[$slug] ?? 0) + $quantite, self::QUANTITE_MAX);
        }

        $lignes = [];
        $total  = 0.0;
        foreach ($quantites as $slug => $quantite) {
            $produit = $this->produits->trouver((string) $slug);

            if ($produit === null) {
                Response::erreur('Un article de votre panier n\'est plus disponible. Retirez-le puis réessayez.', 422);
            }

            $lignes[] = [
                'produit_id' => $produit['id'],
                'nom'        => $produit['nom'],
                'prix'       => $produit['prix'],
                'quantite'   => $quantite,
            ];
            $total += $produit['prix'] * $quantite;
        }

        $total  = round($total, 2);
        $numero = $this->commandes->creer((int) $_SESSION['utilisateur'], $lignes, $total);

        Response::json(['commande' => ['numero' => $numero, 'total' => $total, 'articles' => count($lignes)]], 201);
    }
}
