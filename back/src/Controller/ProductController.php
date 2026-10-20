<?php

declare(strict_types=1);

namespace App\Controller;

use App\Core\ProductImages;
use App\Core\Request;
use App\Core\Response;
use App\Model\CategoryModel;
use App\Model\ProductModel;
use InvalidArgumentException;
use PDOException;
use RuntimeException;

final class ProductController
{
    public function __construct(private ProductModel $products, private CategoryModel $categories, private ProductImages $images)
    {
    }

    public function index(): void
    {
        Response::json(['produits' => $this->products->adminAll(), 'tailles' => $this->products->sizes(), 'categories' => $this->categories->all(), 'seuil_stock' => $this->products->defaultThreshold()]);
    }

    public function show(Request $request): void
    {
        $raw = $request->parametre('id', '');
        if (!ctype_digit($raw)) Response::erreur('Identifiant de produit invalide.', 422);
        $product = $this->products->adminFind($this->id((int) $raw));
        if (!$product) Response::erreur('Produit introuvable.', 404);
        Response::json(['produit' => $product]);
    }

    public function save(Request $request): void
    {
        $body = $request->corps();
        $id = array_key_exists('id', $body) ? $this->id($body['id']) : 0;
        $old = $id ? $this->products->adminFind($id) : null;
        if ($id && !$old) Response::erreur('Produit introuvable.', 404);
        $created = [];
        try {
            $name = $this->text($body['nom'] ?? null, 120, 'nom', true);
            $description = $this->text($body['description'] ?? null, 20000, 'description');
            $details = $this->text($body['details'] ?? '', 20000, 'détails', false, false);
            $category = $body['categorie_id'] ?? null;
            if (!is_int($category) || !$this->categories->find($category)) throw new InvalidArgumentException('Choisissez une catégorie existante.');
            $price = $this->money($body['prix'] ?? null, 99999.99, 'prix');
            $printing = ($body['prix_flocage'] ?? null) === null ? null : $this->money($body['prix_flocage'], 999.99, 'prix du flocage');
            $threshold = $body['seuil_stock'] ?? null;
            if (!is_int($threshold) || $threshold < 0 || $threshold > 65535) throw new InvalidArgumentException('Le seuil doit être un entier entre 0 et 65 535.');
            if (!is_bool($body['nouveaute'] ?? null)) throw new InvalidArgumentException('Indiquez si le produit est une nouveauté.');
            $variants = $body['variants'] ?? null;
            $sizes = $this->products->sizes();
            if (!is_array($variants) || !array_is_list($variants) || !$variants || count($variants) > count($sizes)) throw new InvalidArgumentException('Choisissez au moins une taille avec son stock.');
            $selected = [];
            foreach ($variants as $variant) {
                if (!is_array($variant) || !is_int($variant['taille_id'] ?? null) || !in_array($variant['taille_id'], array_column($sizes, 'id'), true)
                    || in_array($variant['taille_id'], $selected, true) || !is_int($variant['quantite'] ?? null) || $variant['quantite'] < 0 || $variant['quantite'] > 65535) {
                    throw new InvalidArgumentException('Les tailles doivent être distinctes et leur stock un entier entre 0 et 65 535.');
                }
                $selected[] = $variant['taille_id'];
            }
            $unique = array_column(array_filter($sizes, static fn(array $size): bool => $size['libelle'] === 'Unique'), 'id');
            if (count($selected) > 1 && array_intersect($selected, $unique)) throw new InvalidArgumentException('La taille Unique ne peut pas être combinée avec d’autres tailles.');
            $allowed = $old ? array_unique(array_merge([$old['image']], $old['images'])) : [];
            $prepared = $this->images->prepare($body['images'] ?? null, $allowed);
            $files = $this->images->store($prepared, $created);
            $plain = strtr(mb_strtolower($name), [
                'à' => 'a', 'â' => 'a', 'ä' => 'a', 'æ' => 'ae', 'ç' => 'c',
                'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e', 'î' => 'i', 'ï' => 'i',
                'ô' => 'o', 'ö' => 'o', 'œ' => 'oe', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ÿ' => 'y',
            ]);
            $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $plain);
            $slug = trim(substr(preg_replace('/[^a-z0-9]+/', '-', strtolower($ascii ?: '')), 0, 120), '-');
            $savedId = $this->products->save([
                'id' => $id, 'nom' => $name, 'description' => $description, 'details' => $details, 'categorie_id' => $category,
                'prix' => $price, 'prix_flocage' => $printing, 'nouveaute' => $body['nouveaute'], 'seuil_stock' => $threshold,
                'variants' => $variants, 'slug' => $slug ?: 'produit-' . bin2hex(random_bytes(6)),
            ], $files);
        } catch (\Throwable $error) {
            $this->images->discard($created);
            if ($error instanceof InvalidArgumentException) Response::erreur($error->getMessage(), 422);
            if ($error instanceof PDOException && $error->getCode() === '23000') Response::erreur('Adresse de produit déjà utilisée ou catégorie devenue indisponible. Rechargez puis vérifiez la saisie.', 409);
            if ($error instanceof RuntimeException && !$error instanceof PDOException) Response::erreur($error->getMessage(), 503);
            throw $error;
        }
        Response::json(['produit' => $this->products->adminFind($savedId)], $id ? 200 : 201);
    }

    public function delete(Request $request): void
    {
        $body = $request->corps();
        $id = $this->id($body['id'] ?? null);
        if (($body['confirmed'] ?? null) !== true) Response::erreur('Confirmez la suppression du produit.', 422);
        if (!$this->products->adminFind($id)) Response::erreur('Produit introuvable.', 404);
        try {
            if ($this->products->delete($id)) Response::json(['deleted' => true]);
        } catch (PDOException $error) {
            if ($error->getCode() !== '23000') throw $error;
        }
        Response::erreur('Suppression impossible : ce produit figure dans une commande.', 409);
    }

    private function id(mixed $id): int
    {
        if (!is_int($id) || $id < 1 || $id > 65535) Response::erreur('Identifiant de produit invalide.', 422);
        return $id;
    }

    private function text(mixed $value, int $max, string $label, bool $singleLine = false, bool $required = true): string
    {
        if (!is_string($value) || mb_strlen(trim($value)) > $max || ($required && !preg_match('/[\p{L}\p{N}]/u', $value))
            || preg_match($singleLine ? '/[\x00-\x1F\x7F]/u' : '/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', $value)) {
            throw new InvalidArgumentException('Vérifiez le champ « ' . $label . ' » (' . $max . ' caractères maximum).');
        }
        return trim($value);
    }

    private function money(mixed $value, float $max, string $label): float
    {
        if ((!is_int($value) && !is_float($value)) || !is_finite((float) $value) || $value < 0 || $value > $max || abs($value * 100 - round($value * 100)) > 0.00001) {
            throw new InvalidArgumentException('Le ' . $label . ' doit être positif ou nul, avec deux décimales maximum (maximum ' . $max . ' €).');
        }
        return (float) $value;
    }
}
