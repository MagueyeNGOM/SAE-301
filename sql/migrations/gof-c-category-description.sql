-- À exécuter une seule fois sur une base existante, avant de déployer GOF-C.
-- Aucune table ni donnée existante n'est supprimée.
ALTER TABLE categorie ADD COLUMN description VARCHAR(255) NOT NULL DEFAULT '';

-- Retour arrière possible avant de saisir des descriptions :
-- ALTER TABLE categorie DROP COLUMN description;
