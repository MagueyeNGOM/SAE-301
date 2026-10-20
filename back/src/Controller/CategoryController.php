<?php

declare(strict_types=1);

namespace App\Controller;

use App\Core\Request;
use App\Core\Response;
use App\Model\CategoryModel;
use PDOException;

final class CategoryController
{
    public function __construct(private CategoryModel $categories)
    {
    }

    public function index(): void
    {
        Response::json(['categories' => $this->categories->all()]);
    }

    public function save(Request $request): void
    {
        $body = $request->corps();
        $id = array_key_exists('id', $body) ? $this->id($body['id']) : 0;
        $rawName = is_string($body['nom'] ?? null) ? $body['nom'] : '';
        $rawDescription = is_string($body['description'] ?? null) ? $body['description'] : '';
        $name = trim($rawName);
        $description = trim($rawDescription);
        if ($name === '' || mb_strlen($name) > 60 || !preg_match('/[\p{L}\p{N}]/u', $name)
            || preg_match('/[\x00-\x1F\x7F]/u', $rawName)) {
            Response::erreur('Saisissez un nom de 1 à 60 caractères contenant une lettre ou un chiffre.', 422);
        }
        if ($description === '' || mb_strlen($description) > 255 || preg_match('/[\x00-\x1F\x7F]/u', $rawDescription)) {
            Response::erreur('Saisissez une description de 1 à 255 caractères, sur une seule ligne.', 422);
        }
        if ($id && $this->categories->find($id) === null) {
            Response::erreur('Catégorie introuvable.', 404);
        }
        if ($this->categories->nameExists($name, $id)) {
            Response::erreur('Une catégorie porte déjà ce nom.', 409);
        }
        try {
            if ($id) {
                $this->categories->update($id, $name, $description);
            } else {
                // Les accents français doivent produire le même slug sous Windows et Linux.
                $plainName = strtr(mb_strtolower($name), [
                    'à' => 'a', 'â' => 'a', 'ä' => 'a', 'æ' => 'ae', 'ç' => 'c',
                    'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e', 'î' => 'i', 'ï' => 'i',
                    'ô' => 'o', 'ö' => 'o', 'œ' => 'oe', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ÿ' => 'y',
                ]);
                $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $plainName);
                $slug = trim(substr(preg_replace('/[^a-z0-9]+/', '-', strtolower($ascii ?: '')), 0, 60), '-');
                $this->categories->create($name, $description, $slug ?: 'categorie-' . bin2hex(random_bytes(4)));
            }
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') {
                Response::erreur('Ce nom produit une adresse déjà utilisée. Choisissez un autre nom.', 409);
            }
            throw $error;
        }
        Response::json(['categories' => $this->categories->all()], $id ? 200 : 201);
    }

    public function delete(Request $request): void
    {
        $body = $request->corps();
        $id = $this->id($body['id'] ?? null);
        if (($body['confirmed'] ?? null) !== true) {
            Response::erreur('Confirmez la suppression de la catégorie.', 422);
        }
        if ($this->categories->find($id) === null) {
            Response::erreur('Catégorie introuvable.', 404);
        }
        try {
            if ($this->categories->delete($id)) {
                Response::json(['categories' => $this->categories->all()]);
            }
        } catch (PDOException $error) {
            if ($error->getCode() !== '23000') throw $error;
        }
        Response::erreur('Suppression impossible : des produits sont rattachés à cette catégorie.', 409);
    }

    private function id(mixed $value): int
    {
        if (!is_int($value) || $value < 1 || $value > 255) {
            Response::erreur('Identifiant de catégorie invalide.', 422);
        }
        return $value;
    }
}
