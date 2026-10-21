-- À exécuter une seule fois (MySQL) sur une base existante, avant de déployer STK-A.
-- Journal des mouvements de stock : une ligne par taille retirée à la commande (quantite < 0)
-- ou remise en stock à l'annulation (quantite > 0). L'historique avant cette migration n'est pas reconstitué.
-- Pas de clé étrangère : les lignes sont conservées même si un produit ou une commande disparaît.
CREATE TABLE mouvement_stock (
    id              INT UNSIGNED      NOT NULL AUTO_INCREMENT,
    produit_id      SMALLINT UNSIGNED NOT NULL,
    taille_id       TINYINT UNSIGNED  NOT NULL,
    commande_id     INT UNSIGNED      NOT NULL,
    type            VARCHAR(20)       NOT NULL,
    quantite        SMALLINT          NOT NULL,
    date_mouvement  DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_mouvement_commande (commande_id),
    KEY idx_mouvement_stock (produit_id, taille_id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Retour arrière :
-- DROP TABLE mouvement_stock;
