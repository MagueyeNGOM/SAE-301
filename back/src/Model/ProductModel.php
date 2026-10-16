<?php

declare(strict_types=1);

namespace App\Model;

use PDO;

/**
 * Accès aux produits de la boutique.
 *
 * Aucune règle métier ici : seulement des requêtes.
 */
final class ProductModel
{
    /** Connexion à la base, fournie à la construction. */
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Tous les produits du catalogue, avec le nom de leur catégorie.
     * Seuls les champs utiles à la carte produit sont renvoyés.
     */
    public function lister(): array
    {
        $sql = 'SELECT produit.id,
                       produit.nom,
                       produit.slug,
                       produit.prix,
                       produit.image,
                       produit.nouveaute,
                       categorie.nom AS categorie
                  FROM produit
            INNER JOIN categorie ON categorie.id = produit.categorie_id
              ORDER BY categorie.ordre, produit.nom';

        $produits = $this->pdo->query($sql)->fetchAll();

        // MySQL renvoie des chaînes : on convertit pour avoir de vrais nombres en JSON.
        foreach ($produits as &$produit) {
            $produit['id']        = (int) $produit['id'];
            $produit['prix']      = (float) $produit['prix'];
            $produit['nouveaute'] = (bool) $produit['nouveaute'];
        }

        return $produits;
    }

    /**
     * Statistiques globales du catalogue, pour la zone d'administration.
     */
    public function statistiques(): array
    {
        $global = $this->pdo->query(
            'SELECT COUNT(*)  AS total,
                    AVG(prix) AS prix_moyen
               FROM produit'
        )->fetch();

        $parCategorie = $this->pdo->query(
            'SELECT categorie.nom AS categorie,
                    COUNT(*)      AS nombre
               FROM produit
         INNER JOIN categorie ON categorie.id = produit.categorie_id
           GROUP BY categorie.id, categorie.nom, categorie.ordre
           ORDER BY categorie.ordre'
        )->fetchAll();

        // MySQL renvoie les nombres sous forme de chaînes : on les convertit.
        $categories = [];

        foreach ($parCategorie as $ligne) {
            $categories[] = [
                'categorie' => $ligne['categorie'],
                'nombre'    => (int) $ligne['nombre'],
            ];
        }

        return [
            'total'        => (int) $global['total'],
            'prixMoyen'    => (float) $global['prix_moyen'],
            'parCategorie' => $categories,
        ];
    }
}
