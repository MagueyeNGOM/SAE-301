<?php

declare(strict_types=1);

use App\Controller\AuthController;
use App\Controller\AdminAuthController;
use App\Controller\AdminOrderController;
use App\Controller\CatalogueController;
use App\Controller\CategoryController;
use App\Controller\ProductController;
use App\Controller\OrderController;
use App\Controller\StatsController;

/**
 * Table des routes de l'API.
 *
 * Clé    : méthode HTTP et chemin, séparés par un ou plusieurs espaces.
 * Valeur : [classe du contrôleur, méthode à appeler].
 *
 * Toute instance de contrôleur utilisée ici doit également être enregistrée
 * dans back/index.php.
 */

return [
    'GET  /api/produits'    => [CatalogueController::class, 'index'],
    'GET  /api/categories'  => [CatalogueController::class, 'categories'],
    'GET  /api/produit'     => [CatalogueController::class, 'show'],
    'POST /api/register'    => [AuthController::class,      'register'],
    'POST /api/login'       => [AuthController::class,      'login'],
    'GET  /api/me'          => [AuthController::class,      'me'],
    'POST /api/logout'      => [AuthController::class,      'logout'],
    'GET  /api/compte'      => [AuthController::class,      'profile'],
    'POST /api/compte/profil' => [AuthController::class,    'updateProfile'],
    'POST /api/commande'    => [OrderController::class,     'creer'],
    'POST /api/admin/login' => [AdminAuthController::class, 'login'],
    'GET  /api/admin/me'    => [AdminAuthController::class, 'me'],
    'POST /api/admin/logout'=> [AdminAuthController::class, 'logout'],
    'GET  /api/admin/stats' => [StatsController::class,     'index'],
    'GET  /api/admin/categories' => [CategoryController::class, 'index'],
    'POST /api/admin/categories/save' => [CategoryController::class, 'save'],
    'POST /api/admin/categories/delete' => [CategoryController::class, 'delete'],
    'GET  /api/admin/produits' => [ProductController::class, 'index'],
    'GET  /api/admin/produit' => [ProductController::class, 'show'],
    'POST /api/admin/produits/save' => [ProductController::class, 'save'],
    'POST /api/admin/produits/delete' => [ProductController::class, 'delete'],
    'GET  /api/admin/commandes' => [AdminOrderController::class, 'index'],
    'GET  /api/admin/commande' => [AdminOrderController::class, 'show'],
    'POST /api/admin/commandes/action' => [AdminOrderController::class, 'action'],
];
