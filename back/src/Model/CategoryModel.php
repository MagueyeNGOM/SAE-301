<?php

declare(strict_types=1);

namespace App\Model;

use PDO;

final class CategoryModel
{
    public function __construct(private PDO $pdo)
    {
    }

    public function all(): array
    {
        $categories = $this->pdo->query(
            'SELECT c.id, c.nom, c.slug, c.description, COUNT(p.id) AS nombre
               FROM categorie c LEFT JOIN produit p ON p.categorie_id = c.id
           GROUP BY c.id, c.nom, c.slug, c.description, c.ordre
           ORDER BY c.ordre, c.id'
        )->fetchAll();
        foreach ($categories as &$category) {
            $category['id'] = (int) $category['id'];
            $category['nombre'] = (int) $category['nombre'];
        }
        return $categories;
    }

    public function find(int $id): ?array
    {
        $query = $this->pdo->prepare('SELECT id, nom, slug, description FROM categorie WHERE id = :id');
        $query->execute(['id' => $id]);
        return $query->fetch() ?: null;
    }

    public function nameExists(string $name, int $exceptId): bool
    {
        $query = $this->pdo->prepare('SELECT id FROM categorie WHERE LOWER(nom) = LOWER(:name) AND id <> :id');
        $query->execute(['name' => $name, 'id' => $exceptId]);
        return $query->fetch() !== false;
    }

    public function create(string $name, string $description, string $slug): void
    {
        $order = min(255, (int) $this->pdo->query('SELECT COALESCE(MAX(ordre), 0) FROM categorie')->fetchColumn() + 1);
        $query = $this->pdo->prepare('INSERT INTO categorie (nom, description, slug, ordre) VALUES (:name, :description, :slug, :position)');
        $query->execute(['name' => $name, 'description' => $description, 'slug' => $slug, 'position' => $order]);
    }

    public function update(int $id, string $name, string $description): void
    {
        // Le slug reste inchangé pour préserver les liens de DEC-A.
        $query = $this->pdo->prepare('UPDATE categorie SET nom = :name, description = :description WHERE id = :id');
        $query->execute(['name' => $name, 'description' => $description, 'id' => $id]);
    }

    public function delete(int $id): bool
    {
        // La condition et la clé étrangère protègent aussi des ajouts concurrents de produits.
        $query = $this->pdo->prepare('DELETE FROM categorie WHERE id = :id AND NOT EXISTS (SELECT 1 FROM produit WHERE categorie_id = :category)');
        $query->execute(['id' => $id, 'category' => $id]);
        return $query->rowCount() === 1;
    }
}
