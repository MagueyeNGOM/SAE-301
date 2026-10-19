<?php

declare(strict_types=1);

namespace App\Controller;

use App\Core\Request;
use App\Core\Response;
use App\Model\ProductModel;

/**
 * Catalogue de la boutique : la liste des produits (DEC-B), les catégories (DEC-A) et la fiche d'un produit (DEC-C).
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
        $categorie = $requete->parametre('categorie');

        // Un slug de catégorie inconnu est une erreur, pas une liste vide.
        if ($categorie !== null && !in_array($categorie, array_column($this->produits->categories(), 'slug'), true)) {
            Response::erreur('Catégorie introuvable', 404);
        }

        Response::json(['produits' => $this->produits->lister($categorie)]);
    }

    public function categories(Request $requete): void
    {
        Response::json(['categories' => $this->produits->categories()]);
    }

    public function show(Request $requete): void
    {
        $produit = $this->produits->trouver($requete->parametre('slug', ''));

        if ($produit === null) {
            Response::erreur('Produit introuvable', 404);
        }

        Response::json(['produit' => $produit]);
    }
}
