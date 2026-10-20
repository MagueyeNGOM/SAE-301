<?php

declare(strict_types=1);

// Ce script reste inaccessible par HTTP, même en cas de mauvaise configuration.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../src/Core/Database.php';
require_once __DIR__ . '/../src/Model/UserModel.php';

use App\Core\Database;
use App\Model\UserModel;

$email = strtolower(trim($argv[1] ?? 'admin.test@boutique-om.local'));
$password = getenv('OM_ADMIN_TEST_PASSWORD') ?: '';
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190
    || mb_strlen($password) < 12 || strlen($password) > 72) {
    fwrite(STDERR, "Indiquez un email valide et OM_ADMIN_TEST_PASSWORD (12 caractères minimum, 72 octets maximum).\n");
    exit(1);
}

try {
    $config = require __DIR__ . '/../config/config.php';
    $pdo = Database::connexion($config['bdd']);
    $existing = (new UserModel($pdo))->parEmail($email);
    if ($existing !== null) {
        if ($existing['role'] !== 'admin') {
            throw new RuntimeException('Cette adresse appartient à un client : aucune modification effectuée.');
        }
        echo "Compte administrateur déjà présent : mot de passe conservé.\n";
        exit;
    }
    $query = $pdo->prepare(
        "INSERT INTO utilisateur (prenom, nom, email, password_hash, role)
         VALUES ('Test', 'Administrateur', :email, :hash, 'admin')"
    );
    $query->execute(['email' => $email, 'hash' => password_hash($password, PASSWORD_BCRYPT)]);
    echo "Compte administrateur de test créé : {$email}\n";
} catch (Throwable $error) {
    fwrite(STDERR, "Création impossible : vérifiez la connexion et que l’adresse est disponible pour un administrateur.\n");
    exit(1);
}
