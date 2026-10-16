<?php

declare(strict_types=1);

namespace App\Controller;

use App\Core\Request;
use App\Core\Response;
use App\Model\ProductModel;

/**
 * Catalogue de la boutique (DEC-B) : la liste complète des produits.
 */
final class CatalogueController
{
    /** Le modèle qui interroge la base, fourni à la construction. */
    private ProductModel $produits;

    public function __construct(ProductModel $produits)
    {
        $this->produits = $produits;
    }

    public function index(Request $requete): void
    {
        Response::json(['produits' => $this->produits->lister()]);
    }
}
