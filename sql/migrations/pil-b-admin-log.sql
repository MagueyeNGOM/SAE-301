-- À exécuter une seule fois (MySQL) sur une base existante, avant de déployer PIL-B.
-- Journal des modifications de commandes faites par les administrateurs.
-- Les lignes sont conservées si la commande disparaît : pas de clé étrangère sur commande.
CREATE TABLE journal_admin (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    admin_id        INT UNSIGNED NOT NULL,
    commande_id     INT UNSIGNED NOT NULL,
    action          VARCHAR(20)  NOT NULL,
    ancien_statut   VARCHAR(20)  NOT NULL,
    nouveau_statut  VARCHAR(20)  NOT NULL,
    date_action     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_journal_commande (commande_id),

    CONSTRAINT fk_journal_admin
        FOREIGN KEY (admin_id) REFERENCES utilisateur (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Retour arrière :
-- DROP TABLE journal_admin;
