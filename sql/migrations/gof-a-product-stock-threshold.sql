-- À exécuter une seule fois sur une base existante, avant de déployer GOF-A.
-- NULL conserve le seuil global actuel, sans modifier les données existantes.
ALTER TABLE produit ADD COLUMN seuil_stock SMALLINT UNSIGNED NULL DEFAULT NULL;

-- Retour arrière : sauvegarder les seuils personnalisés avant cette opération.
-- ALTER TABLE produit DROP COLUMN seuil_stock;
