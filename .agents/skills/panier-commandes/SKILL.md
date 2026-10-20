---
name: panier-commandes
description: Travailler sur le panier, l'authentification client et la validation des commandes.
---

# Panier et commandes

US concernées : CMD-B, CMD-C, CMD-A.

Ces fonctionnalités sont déclarées implémentées.

## Panier

- Conserver la persistance avec localStorage.
- Permettre l'ajout et la suppression d'articles.
- Permettre la modification des quantités.
- Recalculer automatiquement les totaux.
- Préserver les options des produits.
- Respecter les limites de stock.

## Authentification

- Conserver l'inscription et la connexion.
- Conserver la déconnexion.
- Protéger les sessions.
- Utiliser un hash sécurisé des mots de passe.
- Régénérer la session à la connexion.
- Garder des erreurs compréhensibles en français.

## Commandes

- Exiger une connexion avant validation.
- Présenter un récapitulatif avant confirmation.
- Enregistrer les commandes en base de données.
- Générer un numéro unique.
- Conserver les prix au moment de la commande.
- Conserver les options sélectionnées.
- Utiliser le statut initial « en cours ».
- Vider le panier après validation réussie.
- Afficher une confirmation claire.
- Ne jamais intégrer de paiement en ligne.

## Vérifications

- Tester la persistance du panier.
- Tester les quantités et les totaux.
- Tester les accès non authentifiés.
- Tester la commande complète.
- Vérifier les données enregistrées.