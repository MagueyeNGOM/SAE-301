<?php

declare(strict_types=1);

namespace App\Controller;

use App\Core\Response;
use App\Model\ProductModel;
use App\Model\OrderModel;

/**
 * Statistiques du catalogue, réservées aux administrateurs.
 */
final class StatsController
{
    /** Le modèle qui interroge la base, fourni à la construction. */
    private ProductModel $produits;

    public function __construct(ProductModel $produits, private OrderModel $orders)
    {
        $this->produits = $produits;
    }

    public function index(): void
    {
        AdminAuthController::requireAdmin();

        // Calculé à chaque appel (réponse en no-store) : les chiffres sont toujours ceux de la base.
        Response::json($this->produits->statistiques() + [
            'orders'     => $this->orders->count(),
            'compteurs'  => $this->orders->compteurs(),
            'revenus'    => $this->orders->revenus7Jours(),
            'plusVendus' => $this->orders->plusVendus(),
            'stocks'     => $this->produits->stocksParProduit(),
            'alertes'    => $this->produits->alertesStock(),
        ]);
    }
}
