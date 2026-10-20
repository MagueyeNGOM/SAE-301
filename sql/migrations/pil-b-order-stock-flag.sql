-- À exécuter une seule fois sur une base existante, avant de déployer PIL-B.
-- Les commandes déjà enregistrées gardent 0 : elles n'ont jamais retiré de stock,
-- leur annulation ne doit donc rien remettre en stock.
ALTER TABLE commande ADD COLUMN stock_decremente TINYINT(1) NOT NULL DEFAULT 0;

-- Retour arrière :
-- ALTER TABLE commande DROP COLUMN stock_decremente;
