---
name: gestion-stocks
description: Travailler sur l'affichage des disponibilités et les contraintes de stock, notamment par variante.
---

# Disponibilité et contraintes de stock

US implémentées déclarées :
- STK-B : affichage des stocks.
- STK-C : contraintes de stock.

US non réalisée :
- STK-A : mise à jour automatique des stocks.

## Affichage

- Afficher l'état de disponibilité des produits.
- Utiliser les états :
  - En stock.
  - Bientôt épuisé.
  - Épuisé.
- Utiliser un seuil configurable pour stock faible.
- Différencier visuellement les états.
- Respecter le stock de chaque variante.

## Contraintes

- Empêcher l'ajout d'un produit épuisé.
- Limiter la quantité au stock disponible.
- Afficher des erreurs claires en français.
- Ajuster les quantités du panier si nécessaire.
- Vérifier la disponibilité avant l'ajout.
- Revérifier le stock à la validation.
- Appliquer les contraintes par variante.
- Contrôler côté client et côté serveur.

## Attention à STK-A

La mise à jour automatique des stocks
est une US distincte, encore à développer.

Ne pas supposer que sont implémentés :
- la décrémentation transactionnelle ;
- la restauration du stock à l'annulation ;
- le journal des mouvements ;
- la gestion des commandes concurrentes.

## Vérifications

Tester :
- Stock disponible.
- Stock faible.
- Stock nul.
- Quantité supérieure au stock.
- Changement de disponibilité.
- Variante épuisée.
- Refus d'une quantité invalide côté serveur.