<?php

declare(strict_types=1);

namespace App\Controller;

use App\Core\Request;
use App\Core\Response;
use App\Model\UserModel;

/** Authentification GOF-B, dans une session indépendante de celle des clients. */
final class AdminAuthController
{
    public function __construct(private UserModel $users)
    {
    }

    public function login(Request $request): void
    {
        $body = $request->corps();
        $email = is_string($body['email'] ?? null) ? strtolower(trim($body['email'])) : '';
        $password = is_string($body['mdp'] ?? null) ? $body['mdp'] : '';

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
            Response::erreur('Saisissez une adresse e-mail valide.', 422);
        }
        if ($password === '' || strlen($password) > 72) {
            Response::erreur('Saisissez votre mot de passe (72 octets maximum).', 422);
        }

        $user = $this->users->parEmail($email);
        if ($user === null || !password_verify($password, $user['password_hash']) || $user['role'] !== 'admin') {
            Response::erreur('Identifiants administrateur incorrects.', 401);
        }

        session_regenerate_id(true);
        $_SESSION = ['admin_id' => (int) $user['id'], 'admin_name' => $user['nom']];
        $this->me();
    }

    public function me(): void
    {
        Response::json(isset($_SESSION['admin_id'])
            ? ['connecte' => true, 'nom' => $_SESSION['admin_name']]
            : ['connecte' => false]);
    }

    public function logout(): void
    {
        $_SESSION = [];
        $cookie = session_get_cookie_params();
        unset($cookie['lifetime']);
        setcookie(session_name(), '', ['expires' => time() - 3600] + $cookie);
        session_destroy();
        Response::json(['connecte' => false]);
    }

    public static function requireAdmin(): void
    {
        if (!isset($_SESSION['admin_id'])) {
            Response::erreur('Authentification administrateur requise.', 401);
        }
    }
}
