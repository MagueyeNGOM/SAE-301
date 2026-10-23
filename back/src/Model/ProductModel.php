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

    /** Stock total en dessous duquel un produit est « Bientôt épuisé » (STK-B). */
    private int $seuilStock;

    public function __construct(PDO $pdo, int $seuilStock)
    {
        $this->pdo = $pdo;
        $this->seuilStock = $seuilStock;
    }

    /**
     * État du stock d'un produit à partir de sa quantité totale (STK-B) :
     * « epuise », « bientot » ou « en_stock ».
     */
    private function etatStock(int $quantite, ?int $threshold = null): string
    {
        if ($quantite < 1) {
            return 'epuise';
        }

        return $quantite <= ($threshold ?? $this->seuilStock) ? 'bientot' : 'en_stock';
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
     * Les produits du catalogue, avec leurs tailles et le nom de leur catégorie.
     * Si $categorie (slug) est donné, seuls ceux de cette catégorie.
     * Les tailles alimentent les puces de disponibilité sur les cartes.
     */
    public function lister(?string $categorie = null): array
    {
        $sql = 'SELECT produit.id,
                       produit.nom,
                       produit.slug,
                       produit.prix,
                       produit.image,
                       produit.nouveaute,
                       produit.seuil_stock,
                       categorie.nom AS categorie,
                       (SELECT COALESCE(SUM(stock.quantite), 0)
                          FROM stock
                         WHERE stock.produit_id = produit.id) AS quantite_stock
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
            $produit['stock']     = $this->etatStock((int) $produit['quantite_stock'], isset($produit['seuil_stock']) ? (int) $produit['seuil_stock'] : null);
            $produit['tailles']   = [];
            unset($produit['quantite_stock'], $produit['seuil_stock']);
        }
        unset($produit);

        if ($produits === []) {
            return $produits;
        }

        $ids = array_column($produits, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $requeteTailles = $this->pdo->prepare(
            'SELECT stock.produit_id, taille.id, taille.libelle, stock.quantite
               FROM stock
         INNER JOIN taille ON taille.id = stock.taille_id
              WHERE stock.produit_id IN (' . $placeholders . ')
           ORDER BY stock.produit_id, taille.ordre'
        );
        $requeteTailles->execute($ids);
        $taillesParProduit = [];
        foreach ($requeteTailles->fetchAll() as $taille) {
            $produitId = (int) $taille['produit_id'];
            $taillesParProduit[$produitId][] = [
                'id' => (int) $taille['id'],
                'libelle' => $taille['libelle'],
                'quantite' => (int) $taille['quantite'],
            ];
        }

        foreach ($produits as &$produit) {
            $produit['tailles'] = $taillesParProduit[$produit['id']] ?? [];
        }
        unset($produit);

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
                    produit.prix_flocage,
                    produit.image,
                    produit.nouveaute,
                    produit.seuil_stock,
                    categorie.nom AS categorie,
                    categorie.slug AS categorieSlug
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

        // Prix du flocage : null si le produit ne se floque pas.
        $produit['prixFlocage'] = $produit['prix_flocage'] === null ? null : (float) $produit['prix_flocage'];
        unset($produit['prix_flocage']);

        // Tailles proposées (OPT-C), chacune une variante avec son propre stock
        // (OPT-B), dans l'ordre XS → XXL ; quantite 0 : épuisée.
        $tailles = $this->pdo->prepare(
            'SELECT taille.id, taille.libelle, stock.quantite
               FROM stock
         INNER JOIN taille ON taille.id = stock.taille_id
              WHERE stock.produit_id = :id
           ORDER BY taille.ordre'
        );
        $tailles->execute(['id' => $produit['id']]);
        $produit['tailles'] = $tailles->fetchAll();
        foreach ($produit['tailles'] as &$taille) {
            $taille['id']       = (int) $taille['id'];
            $taille['quantite'] = (int) $taille['quantite'];
        }
        unset($taille);

        // État global du produit : somme des stocks de ses tailles (STK-B).
        $produit['stock'] = $this->etatStock(array_sum(array_column($produit['tailles'], 'quantite')), isset($produit['seuil_stock']) ? (int) $produit['seuil_stock'] : null);
        unset($produit['seuil_stock']);

        // Galerie : les fichiers d'image dans l'ordre d'affichage.
        $images = $this->pdo->prepare(
            'SELECT fichier FROM image_produit WHERE produit_id = :id ORDER BY ordre'
        );
        $images->execute(['id' => $produit['id']]);
        $produit['images'] = $images->fetchAll(PDO::FETCH_COLUMN);

        return $produit;
    }

    public function adminAll(): array
    {
        $rows = $this->pdo->query('SELECT p.*, c.nom AS categorie,
            (SELECT COALESCE(SUM(s.quantite), 0) FROM stock s WHERE s.produit_id = p.id) AS quantite_stock
            FROM produit p INNER JOIN categorie c ON c.id = p.categorie_id ORDER BY p.nom, p.id')->fetchAll();
        foreach ($rows as &$row) {
            foreach (['id', 'categorie_id', 'quantite_stock'] as $key) $row[$key] = (int) $row[$key];
            $row['prix'] = (float) $row['prix'];
            $row['prix_flocage'] = $row['prix_flocage'] === null ? null : (float) $row['prix_flocage'];
            $row['nouveaute'] = (bool) $row['nouveaute'];
            $row['seuil_stock'] = $row['seuil_stock'] === null ? $this->seuilStock : (int) $row['seuil_stock'];
            $row['stock'] = $this->etatStock($row['quantite_stock'], $row['seuil_stock']);
        }
        return $rows;
    }

    /** Stock total de chaque produit (histogramme PIL-A). */
    public function stocksParProduit(): array
    {
        return array_map(fn ($p) => ['nom' => $p['nom'], 'quantite' => $p['quantite_stock']], $this->adminAll());
    }

    /** Tailles dont le stock est au seuil ou en dessous, les plus critiques d'abord. */
    public function alertesStock(): array
    {
        $requete = $this->pdo->prepare(
            'SELECT p.nom, t.libelle AS taille, s.quantite FROM stock s
             JOIN produit p ON p.id = s.produit_id JOIN taille t ON t.id = s.taille_id
             WHERE s.quantite <= COALESCE(p.seuil_stock, :seuil) ORDER BY s.quantite, p.nom, t.ordre'
        );
        $requete->execute(['seuil' => $this->seuilStock]);
        $alertes = $requete->fetchAll();
        foreach ($alertes as &$alerte) $alerte['quantite'] = (int) $alerte['quantite'];
        return $alertes;
    }

    public function sizes(): array
    {
        $rows = $this->pdo->query('SELECT id, libelle FROM taille ORDER BY ordre, id')->fetchAll();
        foreach ($rows as &$row) $row['id'] = (int) $row['id'];
        return $rows;
    }

    public function defaultThreshold(): int
    {
        return $this->seuilStock;
    }

    public function adminFind(int $id): ?array
    {
        $query = $this->pdo->prepare('SELECT * FROM produit WHERE id = :id');
        $query->execute(['id' => $id]);
        $row = $query->fetch();
        if (!$row) return null;
        foreach (['id', 'categorie_id'] as $key) $row[$key] = (int) $row[$key];
        $row['prix'] = (float) $row['prix'];
        $row['prix_flocage'] = $row['prix_flocage'] === null ? null : (float) $row['prix_flocage'];
        $row['nouveaute'] = (bool) $row['nouveaute'];
        $row['seuil_stock'] = $row['seuil_stock'] === null ? $this->seuilStock : (int) $row['seuil_stock'];
        $query = $this->pdo->prepare('SELECT taille_id, quantite FROM stock WHERE produit_id = :id ORDER BY taille_id');
        $query->execute(['id' => $id]);
        $row['variants'] = array_map(static fn(array $variant): array => [
            'taille_id' => (int) $variant['taille_id'], 'quantite' => (int) $variant['quantite'],
        ], $query->fetchAll());
        $query = $this->pdo->prepare('SELECT fichier FROM image_produit WHERE produit_id = :id ORDER BY ordre');
        $query->execute(['id' => $id]);
        $row['images'] = $query->fetchAll(PDO::FETCH_COLUMN);
        if ($row['images'] === []) $row['images'] = [$row['image']];
        $row['revision'] = hash('sha256', json_encode($row, JSON_THROW_ON_ERROR));
        return $row;
    }

    public function save(array $product, array $images): int
    {
        $this->pdo->beginTransaction();
        try {
            $id = $product['id'];
            if ($id) {
                // Même verrou que la commande : un ancien formulaire ne peut pas effacer une vente.
                $lock = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : '';
                $query = $this->pdo->prepare('SELECT id FROM produit WHERE id = :id' . $lock);
                $query->execute(['id' => $id]);
                $query = $this->pdo->prepare('SELECT taille_id FROM stock WHERE produit_id = :id ORDER BY taille_id' . $lock);
                $query->execute(['id' => $id]);
                $query->fetchAll();
                $current = $this->adminFind($id);
                if (!$current || !hash_equals($current['revision'], $product['revision'] ?? '')) {
                    throw new \DomainException('Ce produit ou son stock a changé. Fermez le formulaire et rouvrez-le avant de modifier le produit.');
                }
                $kept = array_column($product['variants'], 'taille_id');
                $query = $this->pdo->prepare("SELECT DISTINCT l.taille_id FROM ligne_commande l JOIN commande c ON c.id = l.commande_id
                    WHERE l.produit_id = :id AND c.stock_decremente = 1 AND c.statut IN ('en cours', 'disponible') AND l.taille_id IS NOT NULL");
                $query->execute(['id' => $id]);
                foreach ($query->fetchAll(PDO::FETCH_COLUMN) as $size) {
                    if (!in_array((int) $size, $kept, true)) {
                        throw new \DomainException('Cette taille figure dans une commande en cours ou disponible : elle ne peut pas être retirée.');
                    }
                }
            }
            $values = array_intersect_key($product, array_flip(['nom', 'description', 'details', 'prix', 'categorie_id', 'prix_flocage', 'nouveaute', 'seuil_stock']));
            $values['nouveaute'] = (int) $values['nouveaute'];
            $values['image'] = $images[0];
            if ($id) {
                // Le slug reste stable, y compris lorsque le produit change de nom ou de catégorie.
                $assignments = implode(', ', array_map(static fn(string $key): string => "$key = :$key", array_keys($values)));
                $query = $this->pdo->prepare('UPDATE produit SET ' . $assignments . ' WHERE id = :id');
                $query->execute($values + ['id' => $id]);
                if ($query->rowCount() === 0 && $this->adminFind($id) === null) throw new \RuntimeException('Produit introuvable.');
            } else {
                $values['slug'] = $product['slug'];
                $query = $this->pdo->prepare('INSERT INTO produit (' . implode(', ', array_keys($values)) . ') VALUES (:' . implode(', :', array_keys($values)) . ')');
                $query->execute($values);
                $id = (int) $this->pdo->lastInsertId();
            }
            // Les autres tables conservent leurs identifiants, notamment les tailles des commandes.
            $this->pdo->prepare('DELETE FROM stock WHERE produit_id = :id')->execute(['id' => $id]);
            $query = $this->pdo->prepare('INSERT INTO stock (produit_id, taille_id, quantite) VALUES (:product, :size, :quantity)');
            foreach ($product['variants'] as $variant) $query->execute(['product' => $id, 'size' => $variant['taille_id'], 'quantity' => $variant['quantite']]);
            $this->pdo->prepare('DELETE FROM image_produit WHERE produit_id = :id')->execute(['id' => $id]);
            $query = $this->pdo->prepare('INSERT INTO image_produit (produit_id, ordre, fichier) VALUES (:id, :position, :file)');
            foreach ($images as $position => $file) $query->execute(['id' => $id, 'position' => $position + 1, 'file' => $file]);
            $this->pdo->commit();
            return $id;
        } catch (\Throwable $error) {
            $this->pdo->rollBack();
            throw $error;
        }
    }

    public function delete(int $id): bool
    {
        // La clé étrangère RESTRICT reste la protection finale contre une commande concurrente.
        $query = $this->pdo->prepare('DELETE FROM produit WHERE id = :id AND NOT EXISTS (SELECT 1 FROM ligne_commande WHERE produit_id = :product)');
        $query->execute(['id' => $id, 'product' => $id]);
        return $query->rowCount() === 1;
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
