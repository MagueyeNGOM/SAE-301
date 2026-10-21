<?php

declare(strict_types=1);

namespace App\Controller;

use App\Core\Request;
use App\Core\Response;
use App\Model\OrderModel;
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

    /** Commandes récentes de l'espace personnel (SUI-B). */
    private OrderModel $commandes;

    public function __construct(UserModel $utilisateurs, OrderModel $commandes)
    {
        $this->utilisateurs = $utilisateurs;
        $this->commandes    = $commandes;
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

    /**
     * Espace personnel (SUI-B) : profil et commandes récentes du client connecté.
     */
    public function profile(): void
    {
        $id     = $this->clientConnecte();
        $compte = $this->utilisateurs->parId($id);

        Response::json([
            'nom'       => $compte['nom'],
            'email'     => $compte['email'],
            'depuis'    => $compte['date_creation'],
            'commandes' => $this->commandes->recentesPourUtilisateur($id),
        ]);
    }

    /**
     * Historique des commandes du client connecté (SUI-C), 6 par page.
     * Filtres facultatifs : ?statut=… et ?periode=30 (30 derniers jours).
     */
    public function orders(Request $requete): void
    {
        $id     = $this->clientConnecte();
        $statut = $requete->parametre('statut');
        if ($statut !== null && !in_array($statut, ['en cours', 'disponible', 'retirée', 'annulée'], true)) {
            Response::erreur('Statut inconnu.', 422);
        }
        $periode = $requete->parametre('periode');
        if ($periode !== null && $periode !== '30') {
            Response::erreur('Période inconnue.', 422);
        }
        $page = max(1, (int) $requete->parametre('page', '1'));

        $parPage    = 6;
        $historique = $this->commandes->historique($id, $statut, $periode === null ? null : 30, $page, $parPage);

        Response::json([
            'commandes' => $historique['commandes'],
            'page'      => $page,
            'pages'     => max(1, (int) ceil($historique['total'] / $parPage)),
        ]);
    }

    /** Détail d'une commande du client connecté (SUI-C) : 404 si elle n'est pas la sienne. */
    public function order(Request $requete): void
    {
        $id       = $this->clientConnecte();
        $commande = $this->commandes->detailPourUtilisateur($id, (string) $requete->parametre('numero', ''));
        if ($commande === null) {
            Response::erreur('Commande introuvable.', 404);
        }

        Response::json($commande);
    }

    /** Lignes d'une ancienne commande avec leur disponibilité actuelle (SUI-A) : 404 si elle n'est pas la sienne. */
    public function reorder(Request $requete): void
    {
        $id     = $this->clientConnecte();
        $lignes = $this->commandes->reorderLines($id, (string) $requete->parametre('numero', ''));
        if ($lignes === null) {
            Response::erreur('Commande introuvable.', 404);
        }

        Response::json(['lignes' => $lignes]);
    }

    /**
     * Modifie nom, email et, si « nouveau » est rempli, le mot de passe.
     * Le mot de passe actuel est alors exigé : une session volée ne suffit pas
     * à prendre le contrôle du compte. Tout est validé avant la moindre écriture.
     */
    public function updateProfile(Request $requete): void
    {
        $id      = $this->clientConnecte();
        $corps   = $requete->corps();
        $nom     = trim((string) ($corps['nom'] ?? ''));
        $email   = strtolower(trim((string) ($corps['email'] ?? '')));
        $actuel  = (string) ($corps['actuel'] ?? '');
        $nouveau = (string) ($corps['nouveau'] ?? '');

        if ($nom === '' || mb_strlen($nom) > 60) {
            Response::erreur('Le nom est obligatoire (60 caractères maximum).', 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
            Response::erreur("L'adresse email n'est pas valide.", 422);
        }

        $autre = $this->utilisateurs->parEmail($email);
        if ($autre !== null && (int) $autre['id'] !== $id) {
            Response::erreur('Un compte existe déjà avec cette adresse email.', 409);
        }

        $hash = null;
        if ($nouveau !== '') {
            $compte = $this->utilisateurs->parId($id);
            if ($actuel === '' || !password_verify($actuel, $compte['password_hash'])) {
                Response::erreur('Le mot de passe actuel est incorrect.', 403);
            }
            // bcrypt ignore tout ce qui dépasse 72 octets : on refuse plutôt que de tronquer.
            if (mb_strlen($nouveau) < 8 || strlen($nouveau) > 72) {
                Response::erreur('Le nouveau mot de passe doit contenir entre 8 et 72 caractères.', 422);
            }
            $hash = password_hash($nouveau, PASSWORD_DEFAULT);
        }

        $this->utilisateurs->modifierProfil($id, $nom, $email);
        $_SESSION['nom'] = $nom;
        if ($hash !== null) {
            $this->utilisateurs->modifierMdp($id, $hash);
            // Nouvel identifiant de session, sans perdre la connexion en cours.
            session_regenerate_id(true);
        }

        Response::json(['nom' => $nom, 'email' => $email, 'mdpModifie' => $hash !== null]);
    }

    /**
     * Identifiant du client connecté, lu en session et jamais dans la requête.
     * Sans session client : 401.
     */
    private function clientConnecte(): int
    {
        if (!isset($_SESSION['utilisateur']) || ($_SESSION['role'] ?? '') !== 'client') {
            Response::erreur('Connectez-vous pour accéder à votre espace.', 401);
        }

        return (int) $_SESSION['utilisateur'];
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
