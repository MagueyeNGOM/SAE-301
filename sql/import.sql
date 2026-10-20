-- ---------------------------------------------------------------------------
-- Boutique OM click & collect — tables et jeu de données
--
-- Ce script ne crée PAS de base de données : il ajoute ses tables à une base
-- existante, la vôtre. Depuis phpMyAdmin, sélectionnez d'abord votre base dans
-- la colonne de gauche, puis importez ce fichier depuis l'onglet « Importer ».
--
-- Schéma tiré de la maquette Figma (parcours visiteur) :
--   categorie      Maillots, Entraînement, Supporters (menu et filtres)
--   produit        carte produit et fiche produit (nom, prix, image, badge
--                  « Nouveauté 26/27 », description, détails, flocage)
--   taille         puces et tuiles de taille (XS → XXL, Unique)
--   stock          stock par produit et par taille (« Plus que 3 en taille L »,
--                  « XS et XXL épuisées », badges En stock / Bientôt épuisé)
--   utilisateur    « Mon compte »
--   commande       commande à retirer en boutique, statut et numéro unique
--   ligne_commande article commandé : taille, flocage et prix figés
--
-- L'import est rejouable : les tables sont supprimées avant d'être recréées.
-- ATTENTION : les tables du starter (film, genre) sont supprimées aussi.
-- ---------------------------------------------------------------------------

-- Jeu de caractères de la connexion fixé explicitement : sans cela, un client
-- en latin1 enregistrerait les accents en double encodage (« Ã© »).
SET NAMES utf8mb4;

-- Ordre inverse des dépendances : une table est supprimée avant celles
-- qu'elle référence.
DROP TABLE IF EXISTS ligne_commande;
DROP TABLE IF EXISTS commande;
DROP TABLE IF EXISTS utilisateur;
DROP TABLE IF EXISTS image_produit;
DROP TABLE IF EXISTS stock;
DROP TABLE IF EXISTS taille;
DROP TABLE IF EXISTS produit;
DROP TABLE IF EXISTS categorie;
DROP TABLE IF EXISTS film;
DROP TABLE IF EXISTS genre;

-- ---------------------------------------------------------------------------
-- Catégories
--
-- slug : partie de l'URL propre /categorie/maillots (règles métier).
-- ---------------------------------------------------------------------------
CREATE TABLE categorie (
    id    TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nom   VARCHAR(60)      NOT NULL,
    slug  VARCHAR(60)      NOT NULL,
    description VARCHAR(255) NOT NULL DEFAULT '',
    ordre TINYINT UNSIGNED NOT NULL DEFAULT 0,

    PRIMARY KEY (id),
    UNIQUE KEY uq_categorie_slug (slug)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Produits
--
-- prix : prix de base, hors flocage.
-- prix_flocage : NULL si le produit ne se floque pas (« Flocage officiel ·
-- Nom et numéro · +10,00 € » sur la fiche des maillots).
-- nouveaute : badge « NOUVEAUTÉ 26/27 » de la fiche produit.
-- ---------------------------------------------------------------------------
CREATE TABLE produit (
    id           SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    categorie_id TINYINT UNSIGNED  NOT NULL,
    nom          VARCHAR(120)      NOT NULL,
    slug         VARCHAR(120)      NOT NULL,
    description  TEXT              NOT NULL,
    details      TEXT              NULL,
    prix         DECIMAL(7,2)      NOT NULL,
    prix_flocage DECIMAL(5,2)      NULL,
    image        VARCHAR(255)      NOT NULL,
    nouveaute    BOOLEAN           NOT NULL DEFAULT FALSE,
    date_ajout   DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_produit_slug (slug),
    KEY idx_produit_categorie (categorie_id),
    KEY idx_produit_prix (prix),

    CONSTRAINT fk_produit_categorie
        FOREIGN KEY (categorie_id) REFERENCES categorie (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT ck_produit_prix CHECK (prix >= 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Tailles
--
-- ordre : affichage XS, S, M, L, XL, XXL (un tri alphabétique les mélangerait).
-- « Unique » sert aux produits sans taille (écharpe, mug…).
-- ---------------------------------------------------------------------------
CREATE TABLE taille (
    id      TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    libelle VARCHAR(10)      NOT NULL,
    ordre   TINYINT UNSIGNED NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_taille_libelle (libelle)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Stock par produit et par taille
--
-- Une ligne = une taille proposée. quantite = 0 : taille épuisée (puce barrée).
-- Le stock d'un produit est la somme de ses lignes.
-- ---------------------------------------------------------------------------
CREATE TABLE stock (
    produit_id SMALLINT UNSIGNED NOT NULL,
    taille_id  TINYINT UNSIGNED  NOT NULL,
    quantite   SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    PRIMARY KEY (produit_id, taille_id),
    KEY idx_stock_taille (taille_id),

    CONSTRAINT fk_stock_produit
        FOREIGN KEY (produit_id) REFERENCES produit (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_stock_taille
        FOREIGN KEY (taille_id) REFERENCES taille (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Galerie d'images d'un produit (fiche produit)
--
-- fichier : chemin relatif à front/public/images/produits/.
-- ordre : position dans la galerie (1 = image affichée en premier).
-- ---------------------------------------------------------------------------
CREATE TABLE image_produit (
    produit_id SMALLINT UNSIGNED NOT NULL,
    ordre      TINYINT UNSIGNED  NOT NULL,
    fichier    VARCHAR(255)      NOT NULL,

    PRIMARY KEY (produit_id, ordre),

    CONSTRAINT fk_image_produit
        FOREIGN KEY (produit_id) REFERENCES produit (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Utilisateurs
--
-- password_hash : résultat de password_hash() en PHP, jamais le mot de passe.
-- ---------------------------------------------------------------------------
CREATE TABLE utilisateur (
    id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    prenom         VARCHAR(60)  NOT NULL,
    nom            VARCHAR(60)  NOT NULL,
    email          VARCHAR(190) NOT NULL,
    telephone      VARCHAR(20)  NULL,
    password_hash  VARCHAR(255) NOT NULL,
    role           ENUM('client', 'admin') NOT NULL DEFAULT 'client',
    date_creation  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_utilisateur_email (email)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Commandes (retrait en boutique, pas de paiement)
--
-- numero : numéro unique montré au client et au retrait.
-- statut : en cours → disponible → retirée, ou annulée (admin seulement ;
-- l'annulation remet le stock, voir règles métier).
-- total : somme des lignes, figée au moment de la commande.
-- ---------------------------------------------------------------------------
CREATE TABLE commande (
    id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero         VARCHAR(20)  NOT NULL,
    utilisateur_id INT UNSIGNED NOT NULL,
    statut         ENUM('en cours', 'disponible', 'retirée', 'annulée') NOT NULL DEFAULT 'en cours',
    total          DECIMAL(8,2) NOT NULL,
    date_commande  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_retrait   DATETIME     NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_commande_numero (numero),
    KEY idx_commande_utilisateur (utilisateur_id),
    KEY idx_commande_statut (statut),

    CONSTRAINT fk_commande_utilisateur
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Lignes de commande
--
-- taille_id : NULL pour un produit sans taille (aucune ligne dans stock). Choisie sur
-- la fiche produit (OPT-C) et vérifiée par le serveur.
-- Base déjà importée avant CMD-A : ALTER TABLE ligne_commande MODIFY taille_id TINYINT UNSIGNED NULL;
-- nom_produit, prix_unitaire, prix_flocage : copiés au moment de la commande.
-- Un changement de prix ou de nom ensuite ne modifie pas une commande passée.
-- flocage_nom / flocage_numero : NULL sans flocage (« Flocage NGOM 10 »).
-- ---------------------------------------------------------------------------
CREATE TABLE ligne_commande (
    id             INT UNSIGNED      NOT NULL AUTO_INCREMENT,
    commande_id    INT UNSIGNED      NOT NULL,
    produit_id     SMALLINT UNSIGNED NOT NULL,
    taille_id      TINYINT UNSIGNED  NULL,
    nom_produit   VARCHAR(120)      NOT NULL,
    quantite       SMALLINT UNSIGNED NOT NULL,
    prix_unitaire  DECIMAL(7,2)      NOT NULL,
    flocage_nom    VARCHAR(12)       NULL,
    flocage_numero TINYINT UNSIGNED  NULL,
    prix_flocage   DECIMAL(5,2)      NOT NULL DEFAULT 0,

    PRIMARY KEY (id),
    KEY idx_ligne_commande (commande_id),
    KEY idx_ligne_produit (produit_id),

    CONSTRAINT fk_ligne_commande
        FOREIGN KEY (commande_id) REFERENCES commande (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_ligne_produit
        FOREIGN KEY (produit_id) REFERENCES produit (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_ligne_taille
        FOREIGN KEY (taille_id) REFERENCES taille (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT ck_ligne_quantite CHECK (quantite > 0),
    CONSTRAINT ck_ligne_numero CHECK (flocage_numero IS NULL OR flocage_numero <= 99)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Jeu de données (19 produits : 8 maillots, 6 entraînement, 5 supporters,
-- comme les compteurs de la maquette)
-- ---------------------------------------------------------------------------

INSERT INTO categorie (id, nom, slug, ordre) VALUES
    (1, 'Maillots',     'maillots',     1),
    (2, 'Entraînement', 'entrainement', 2),
    (3, 'Supporters',   'supporters',   3);

INSERT INTO taille (id, libelle, ordre) VALUES
    (1, 'XS',     1),
    (2, 'S',      2),
    (3, 'M',      3),
    (4, 'L',      4),
    (5, 'XL',     5),
    (6, 'XXL',    6),
    (7, 'Unique', 7);

-- Images : chemins relatifs à front/public/images/produits/ (à fournir).
INSERT INTO produit (id, categorie_id, nom, slug, description, details, prix, prix_flocage, image, nouveaute) VALUES
    -- Maillots
    ( 1, 1, 'Maillot OM Domicile 26/27',   'maillot-domicile-26-27',
        'Premier maillot à porter la nouvelle identité du club : design blanc, bleu et or. Tissu technique dryCELL qui évacue l''humidité, fabriqué avec au moins 90 % de matériaux recyclés.',
        'Coupe standard. 100 % polyester recyclé. Lavage à 30 °C.', 100.00, 10.00, 'maillot-domicile-26-27.png', TRUE),
    ( 2, 1, 'Maillot OM Extérieur 26/27',  'maillot-exterieur-26-27',
        'Maillot extérieur bleu ciel, porté lors des matchs à l''extérieur de la saison 26/27.',
        'Coupe standard. 100 % polyester recyclé. Lavage à 30 °C.', 100.00, 10.00, 'maillot-exterieur-26-27.png', TRUE),
    ( 3, 1, 'Maillot OM Third 26/27',      'maillot-third-26-27',
        'Troisième maillot de la saison 26/27, édition sombre aux reflets dorés.',
        'Coupe standard. 100 % polyester recyclé. Lavage à 30 °C.', 100.00, 10.00, 'maillot-third-26-27.png', TRUE),
    ( 4, 1, 'Maillot OM Domicile 26/27 Enfant', 'maillot-domicile-26-27-enfant',
        'La version enfant du maillot domicile 26/27, mêmes couleurs et même tissu technique.',
        'Tailles enfant indiquées en équivalent adulte. Lavage à 30 °C.', 75.00, 10.00, 'maillot-domicile-26-27-enfant.png', TRUE),
    ( 5, 1, 'Maillot OM Gardien 26/27',    'maillot-gardien-26-27',
        'Maillot de gardien de but manches longues, saison 26/27.',
        'Coudières renforcées. 100 % polyester. Lavage à 30 °C.', 100.00, 10.00, 'maillot-gardien-26-27.png', TRUE),
    ( 6, 1, 'Maillot OM Domicile 25/26',   'maillot-domicile-25-26',
        'Maillot domicile de la saison précédente, dernières pièces disponibles.',
        'Coupe standard. 100 % polyester. Lavage à 30 °C.', 70.00, 10.00, 'maillot-domicile-25-26.png', FALSE),
    ( 7, 1, 'Maillot OM Extérieur 25/26',  'maillot-exterieur-25-26',
        'Maillot extérieur de la saison précédente, dernières pièces disponibles.',
        'Coupe standard. 100 % polyester. Lavage à 30 °C.', 70.00, 10.00, 'maillot-exterieur-25-26.png', FALSE),
    ( 8, 1, 'Maillot OM King',             'maillot-om-king',
        'Maillot manches longues de la collection OM King, rayé bleu ciel et blanc, numéro 10.',
        'Coton et polyester. Sans flocage officiel. Lavage à 30 °C.', 90.00, NULL, 'maillot-om-king.png', FALSE),
    -- Entraînement
    ( 9, 2, 'Maillot d''entraînement 26/27', 'maillot-entrainement-26-27',
        'Maillot d''entraînement porté par les joueurs pendant les séances de la saison 26/27.',
        'Tissu respirant. 100 % polyester recyclé.', 55.00, NULL, 'maillot-entrainement-26-27.png', TRUE),
    (10, 2, 'Short d''entraînement 26/27', 'short-entrainement-26-27',
        'Short léger assorti au maillot d''entraînement 26/27.',
        'Taille élastique avec cordon. 100 % polyester.', 35.00, NULL, 'short-entrainement-26-27.png', TRUE),
    (11, 2, 'Veste de survêtement 26/27',  'veste-survetement-26-27',
        'Veste zippée du survêtement officiel de la saison 26/27.',
        'Deux poches zippées. 100 % polyester.', 85.00, NULL, 'veste-survetement-26-27.png', TRUE),
    (12, 2, 'Pantalon de survêtement 26/27', 'pantalon-survetement-26-27',
        'Pantalon assorti à la veste de survêtement 26/27.',
        'Bas de jambe zippé. 100 % polyester.', 65.00, NULL, 'pantalon-survetement-26-27.png', TRUE),
    (13, 2, 'Sweat d''avant-match 26/27',  'sweat-avant-match-26-27',
        'Sweat à capuche porté par les joueurs à l''échauffement.',
        'Coton et polyester. Capuche doublée.', 75.00, NULL, 'sweat-avant-match-26-27.png', FALSE),
    (14, 2, 'Coupe-vent OM 26/27',         'coupe-vent-26-27',
        'Coupe-vent léger et déperlant pour les séances par temps de mistral.',
        'Se range dans sa poche. 100 % polyester.', 60.00, NULL, 'coupe-vent-26-27.png', FALSE),
    -- Supporters
    (15, 3, 'Écharpe OM Droit au but',     'echarpe-droit-au-but',
        'Écharpe tricotée bleu ciel et blanc, devise du club brodée.',
        '140 x 20 cm. 100 % acrylique.', 20.00, NULL, 'echarpe-droit-au-but.png', FALSE),
    (16, 3, 'Casquette OM',                'casquette-om',
        'Casquette bleu marine avec écusson brodé.',
        'Réglable à l''arrière. 100 % coton.', 25.00, NULL, 'casquette-om.png', FALSE),
    (17, 3, 'Drapeau OM',                  'drapeau-om',
        'Drapeau aux couleurs du club pour le Vélodrome.',
        '150 x 100 cm. Œillets métalliques.', 15.00, NULL, 'drapeau-om.png', FALSE),
    (18, 3, 'Mug OM',                      'mug-om',
        'Mug en céramique blanc avec écusson.',
        '33 cl. Passe au lave-vaisselle.', 12.00, NULL, 'mug-om.png', FALSE),
    (19, 3, 'Ballon OM 26/27',             'ballon-om-26-27',
        'Ballon officiel aux couleurs de la saison 26/27.',
        'Taille 5. Cousu machine.', 30.00, NULL, 'ballon-om-26-27.png', TRUE);

-- Stock : tailles 1 XS, 2 S, 3 M, 4 L, 5 XL, 6 XXL, 7 Unique.
-- Produit 1 = exemple de la fiche : « Plus que 3 en taille L », XS et XXL
-- épuisées. Quelques produits sont bas en stock pour « Dernières pièces ».
INSERT INTO stock (produit_id, taille_id, quantite) VALUES
    ( 1, 1,  0), ( 1, 2, 12), ( 1, 3, 15), ( 1, 4,  3), ( 1, 5,  8), ( 1, 6,  0),
    ( 2, 2,  0), ( 2, 3,  2), ( 2, 4,  1), ( 2, 5,  0),
    ( 3, 2,  9), ( 3, 3, 14), ( 3, 4, 10), ( 3, 5,  6),
    ( 4, 1,  7), ( 4, 2, 10), ( 4, 3,  8), ( 4, 4,  5), ( 4, 5,  3),
    ( 5, 1,  2), ( 5, 2,  4), ( 5, 3,  6), ( 5, 4,  4), ( 5, 5,  2),
    ( 6, 4,  2), ( 6, 5,  1),
    ( 7, 3,  0), ( 7, 4,  2), ( 7, 5,  1),
    ( 8, 3,  0), ( 8, 4,  0), ( 8, 5,  0),
    ( 9, 2,  8), ( 9, 3, 12), ( 9, 4, 10), ( 9, 5,  6),
    (10, 2,  6), (10, 3, 10), (10, 4,  9), (10, 5,  4),
    (11, 2,  3), (11, 3,  5), (11, 4,  2), (11, 5,  1),
    (12, 2,  4), (12, 3,  6), (12, 4,  5), (12, 5,  3),
    (13, 3,  2), (13, 4,  1), (13, 5,  0),
    (14, 2,  5), (14, 3,  7), (14, 4,  6), (14, 5,  4),
    (15, 7, 40),
    (16, 7, 25),
    (17, 7,  3),
    (18, 7, 30),
    (19, 7, 15);

-- Pas de compte ni de commande insérés : un password_hash ne peut pas être
-- écrit en clair ici. Créer les comptes de test par l'inscription, ou insérer
-- un hash produit par password_hash() en PHP, puis passer un compte en admin :
--   UPDATE utilisateur SET role = 'admin' WHERE email = '...';

-- Images de la galerie, prises sur boutique.om.fr.
INSERT INTO image_produit (produit_id, ordre, fichier) VALUES
    (1, 1, 'galerie/1-1.jpg'),
    (1, 2, 'galerie/1-2.jpg'),
    (1, 3, 'galerie/1-3.jpg'),
    (1, 4, 'galerie/1-4.jpg'),
    (2, 1, 'galerie/2-1.jpg'),
    (2, 2, 'galerie/2-2.jpg'),
    (2, 3, 'galerie/2-3.jpg'),
    (2, 4, 'galerie/2-4.jpg'),
    (3, 1, 'galerie/3-1.jpg'),
    (3, 2, 'galerie/3-2.jpg'),
    (3, 3, 'galerie/3-3.jpg'),
    (3, 4, 'galerie/3-4.jpg'),
    (4, 1, 'galerie/4-1.jpg'),
    (4, 2, 'galerie/4-2.jpg'),
    (4, 3, 'galerie/4-3.jpg'),
    (4, 4, 'galerie/4-4.jpg'),
    (5, 1, 'galerie/5-1.jpg'),
    (5, 2, 'galerie/5-2.jpg'),
    (5, 3, 'galerie/5-3.jpg'),
    (5, 4, 'galerie/5-4.jpg'),
    (6, 1, 'galerie/6-1.jpg'),
    (6, 2, 'galerie/6-2.jpg'),
    (6, 3, 'galerie/6-3.jpg'),
    (6, 4, 'galerie/6-4.jpg'),
    (7, 1, 'galerie/7-1.jpg'),
    (7, 2, 'galerie/7-2.jpg'),
    (7, 3, 'galerie/7-3.jpg'),
    (7, 4, 'galerie/7-4.jpg'),
    (8, 1, 'galerie/8-1.jpg'),
    (8, 2, 'galerie/8-2.jpg'),
    (8, 3, 'galerie/8-3.jpg'),
    (8, 4, 'galerie/8-4.jpg'),
    (9, 1, 'galerie/9-1.jpg'),
    (9, 2, 'galerie/9-2.jpg'),
    (9, 3, 'galerie/9-3.jpg'),
    (9, 4, 'galerie/9-4.jpg'),
    (10, 1, 'galerie/10-1.jpg'),
    (10, 2, 'galerie/10-2.jpg'),
    (10, 3, 'galerie/10-3.jpg'),
    (10, 4, 'galerie/10-4.jpg'),
    (11, 1, 'galerie/11-1.jpg'),
    (11, 2, 'galerie/11-2.jpg'),
    (11, 3, 'galerie/11-3.jpg'),
    (11, 4, 'galerie/11-4.jpg'),
    (12, 1, 'galerie/12-1.jpg'),
    (12, 2, 'galerie/12-2.jpg'),
    (12, 3, 'galerie/12-3.jpg'),
    (12, 4, 'galerie/12-4.jpg'),
    (13, 1, 'galerie/13-1.jpg'),
    (13, 2, 'galerie/13-2.jpg'),
    (13, 3, 'galerie/13-3.jpg'),
    (13, 4, 'galerie/13-4.jpg'),
    (14, 1, 'galerie/14-1.jpg'),
    (14, 2, 'galerie/14-2.jpg'),
    (15, 1, 'galerie/15-1.jpg'),
    (16, 1, 'galerie/16-1.jpg'),
    (16, 2, 'galerie/16-2.jpg'),
    (17, 1, 'galerie/17-1.jpg'),
    (18, 1, 'galerie/18-1.jpg'),
    (18, 2, 'galerie/18-2.jpg'),
    (19, 1, 'galerie/19-1.jpg'),
    (19, 2, 'galerie/19-2.jpg');
