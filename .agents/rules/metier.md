---
trigger: model_decision
description: Règles métier de la boutique (catalogue, panier, commandes, stock). À lire dès qu'on travaille sur les produits, le panier, les commandes ou le back-office.
---

# Règles métier
- 3 catégories (Maillots, Entraînement, Supporters), 4 produits réels minimum chacune.
- URLs propres : `/categorie/nom-categorie`, `/produit/nom-produit`.
- Panier sauvegardé dans le navigateur (localStorage).
- Commande : numéro unique, statut « en cours », prix de chaque produit enregistré au moment de la commande.
- Statuts : en cours, disponible, retirée, annulée. Seul l'admin annule ; l'annulation remet le stock.