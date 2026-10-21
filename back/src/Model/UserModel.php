<?php

declare(strict_types=1);

namespace App\Model;

use PDO;

/**
 * Accès aux comptes clients (CMD-C).
 *
 * Aucune règle métier ici : seulement des requêtes.
 */
final class UserModel
{
    /** Connexion à la base, fournie à la construction. */
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Le compte qui porte cet email, ou null s'il n'existe pas.
     */
    public function parEmail(string $email): ?array
    {
        $requete = $this->pdo->prepare(
            'SELECT id, nom, email, password_hash, role
               FROM utilisateur
              WHERE email = :email'
        );
        $requete->execute(['email' => $email]);

        return $requete->fetch() ?: null;
    }

    /**
     * Crée un compte client et renvoie son identifiant.
     * $hash est le résultat de password_hash(), jamais le mot de passe.
     * La maquette ne demande que le nom : le prénom reste vide.
     */
    public function creer(string $nom, string $email, string $hash): int
    {
        $requete = $this->pdo->prepare(
            'INSERT INTO utilisateur (prenom, nom, email, password_hash)
             VALUES (:prenom, :nom, :email, :hash)'
        );
        $requete->execute([
            'prenom' => '',
            'nom'    => $nom,
            'email'  => $email,
            'hash'   => $hash,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Le compte qui porte cet identifiant, ou null (SUI-B).
     */
    public function parId(int $id): ?array
    {
        $requete = $this->pdo->prepare(
            'SELECT id, nom, email, password_hash, date_creation
               FROM utilisateur
              WHERE id = :id'
        );
        $requete->execute(['id' => $id]);

        return $requete->fetch() ?: null;
    }

    /**
     * Met à jour le nom et l'email du compte (SUI-B).
     */
    public function modifierProfil(int $id, string $nom, string $email): void
    {
        $this->pdo->prepare('UPDATE utilisateur SET nom = :nom, email = :email WHERE id = :id')
            ->execute(['nom' => $nom, 'email' => $email, 'id' => $id]);
    }

    /**
     * Remplace le hash du mot de passe (SUI-B). $hash vient de password_hash().
     */
    public function modifierMdp(int $id, string $hash): void
    {
        $this->pdo->prepare('UPDATE utilisateur SET password_hash = :hash WHERE id = :id')
            ->execute(['hash' => $hash, 'id' => $id]);
    }
}
