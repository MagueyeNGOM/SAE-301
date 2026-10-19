<?php

declare(strict_types=1);

namespace App\Controller;

use App\Core\Request;
use App\Core\Response;
use App\Model\UserModel;

/**
 * Inscription, connexion et déconnexion (CMD-C).
 *
 * L'identité et le rôle de l'utilisateur connecté sont rangés en session,
 * côté serveur. Le client ne détient que l'identifiant de session, dans le
 * cookie PHPSESSID.
 */
final class AuthController
{
    /** Le modèle qui interroge la base, fourni à la construction. */
    private UserModel $utilisateurs;

    public function __construct(UserModel $utilisateurs)
    {
        $this->utilisateurs = $utilisateurs;
    }

    public function register(Request $requete): void
    {
        $corps  = $requete->corps();
        $nom    = trim((string) ($corps['nom']    ?? ''));
        $email  = strtolower(trim((string) ($corps['email'] ?? '')));
        $mdp    = (string) ($corps['mdp'] ?? '');

        if ($nom === '' || mb_strlen($nom) > 60) {
            Response::erreur('Le nom est obligatoire (60 caractères maximum).', 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
            Response::erreur("L'adresse email n'est pas valide.", 422);
        }
        // bcrypt ignore tout ce qui dépasse 72 octets : on refuse plutôt que de tronquer.
        if (mb_strlen($mdp) < 8 || strlen($mdp) > 72) {
            Response::erreur('Le mot de passe doit contenir entre 8 et 72 caractères.', 422);
        }

        if ($this->utilisateurs->parEmail($email) !== null) {
            Response::erreur('Un compte existe déjà avec cette adresse email.', 409);
        }

        // PASSWORD_DEFAULT = bcrypt : le mot de passe n'est jamais stocké en clair.
        $id = $this->utilisateurs->creer($nom, $email, password_hash($mdp, PASSWORD_DEFAULT));

        $this->ouvrirSession($id, $nom, 'client');

        Response::json(['connecte' => true, 'nom' => $nom, 'role' => 'client'], 201);
    }

    public function login(Request $requete): void
    {
        $corps = $requete->corps();
        $email = strtolower(trim((string) ($corps['email'] ?? '')));
        $mdp   = (string) ($corps['mdp'] ?? '');

        if ($email === '' || $mdp === '') {
            Response::erreur("L'email et le mot de passe sont obligatoires.", 422);
        }

        $compte = $this->utilisateurs->parEmail($email);

        // Même message pour un email inconnu et un mauvais mot de passe : on ne
        // révèle pas quels comptes existent.
        if ($compte === null || !password_verify($mdp, $compte['password_hash'])) {
            Response::erreur('Email ou mot de passe incorrect.', 401);
        }

        $this->ouvrirSession((int) $compte['id'], $compte['nom'], $compte['role']);

        Response::json(['connecte' => true, 'nom' => $compte['nom'], 'role' => $compte['role']]);
    }

    /**
     * Qui est connecté ? Permet au front de retrouver l'état de la session.
     */
    public function me(): void
    {
        if (!isset($_SESSION['utilisateur'])) {
            Response::json(['connecte' => false]);
        }

        Response::json([
            'connecte' => true,
            'nom'      => $_SESSION['nom'],
            'role'     => $_SESSION['role'],
        ]);
    }

    public function logout(): void
    {
        $_SESSION = [];                               // vide la copie en mémoire

        // Supprime le cookie, avec le chemin sous lequel il a été posé : celui
        // que index.php a réglé avant session_start().
        setcookie(session_name(), '', [
            'expires' => time() - 3600,
            'path'    => session_get_cookie_params()['path'],
        ]);

        session_destroy();                            // efface le fichier serveur

        Response::json(['connecte' => false]);
    }

    /**
     * L'utilisateur devient authentifié : on lui attribue un identifiant de
     * session neuf, et on détruit l'ancien (true). Aucun identifiant connu
     * avant ce point ne donne plus accès à la session.
     */
    private function ouvrirSession(int $id, string $nom, string $role): void
    {
        session_regenerate_id(true);

        $_SESSION['utilisateur'] = $id;
        $_SESSION['nom']         = $nom;
        $_SESSION['role']        = $role;
    }
}
