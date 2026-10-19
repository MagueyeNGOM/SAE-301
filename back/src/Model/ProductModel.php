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
     * Les catégories avec leur nombre de produits, dans l'ordre du menu (DEC-A).
     */
    public function categories(): array
    {
        $categories = $this->pdo->query(
            'SELECT categorie.nom,
                    categorie.slug,
                    COUNT(produit.id) AS nombre
               FROM categorie
          LEFT JOIN produit ON produit.categorie_id = categorie.id
           GROUP BY categorie.id, categorie.nom, categorie.slug, categorie.ordre
           ORDER BY categorie.ordre'
        )->fetchAll();

        // MySQL renvoie des chaînes : on convertit pour avoir de vrais nombres en JSON.
        foreach ($categories as &$categorie) {
            $categorie['nombre'] = (int) $categorie['nombre'];
        }

        return $categories;
    }

    /**
     * Les produits du catalogue, avec le nom de leur catégorie.
     * Si $categorie (slug) est donné, seuls ceux de cette catégorie.
     * Seuls les champs utiles à la carte produit sont renvoyés.
     */
    public function lister(?string $categorie = null): array
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
             WHERE :tous IS NULL OR categorie.slug = :categorie
              ORDER BY categorie.ordre, produit.nom';

        $requete = $this->pdo->prepare($sql);
        $requete->execute(['tous' => $categorie, 'categorie' => $categorie]);
        $produits = $requete->fetchAll();

        // MySQL renvoie des chaînes : on convertit pour avoir de vrais nombres en JSON.
        foreach ($produits as &$produit) {
            $produit['id']        = (int) $produit['id'];
            $produit['prix']      = (float) $produit['prix'];
            $produit['nouveaute'] = (bool) $produit['nouveaute'];
        }

        return $produits;
    }

    /**
     * La fiche d'un produit à partir de son slug, ou null s'il n'existe pas.
     */
    public function trouver(string $slug): ?array
    {
        $requete = $this->pdo->prepare(
            'SELECT produit.id,
                    produit.nom,
                    produit.slug,
                    produit.description,
                    produit.details,
                    produit.prix,
                    produit.image,
                    produit.nouveaute,
                    categorie.nom AS categorie
               FROM produit
         INNER JOIN categorie ON categorie.id = produit.categorie_id
              WHERE produit.slug = :slug'
        );
        $requete->execute(['slug' => $slug]);
        $produit = $requete->fetch();

        if ($produit === false) {
            return null;
        }

        // MySQL renvoie des chaînes : on convertit pour avoir de vrais nombres en JSON.
        $produit['id']        = (int) $produit['id'];
        $produit['prix']      = (float) $produit['prix'];
        $produit['nouveaute'] = (bool) $produit['nouveaute'];

        // Galerie : les fichiers d'image dans l'ordre d'affichage.
        $images = $this->pdo->prepare(
            'SELECT fichier FROM image_produit WHERE produit_id = :id ORDER BY ordre'
        );
        $images->execute(['id' => $produit['id']]);
        $produit['images'] = $images->fetchAll(PDO::FETCH_COLUMN);

        return $produit;
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
