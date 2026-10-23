---
name: option-variantes
description: Travailler sur les options produit, les variantes et leur conservation dans les commandes.
---

# Options et variantes

US concernées : OPT-C, OPT-B, OPT-A.

Ces fonctionnalités sont déclarées implémentées.

## Options produit

- Chaque produit peut avoir ses propres options.
- Afficher les options sur sa fiche.
- Permettre la sélection des combinaisons.
- Actualiser le prix selon les options.
- Ajouter au panier les options choisies.

## Variantes

- Chaque variante représente une combinaison
  d'options définie pour un produit.
- Chaque variante possède son propre stock.
- Signaler les variantes indisponibles.
- Refuser les combinaisons inexistantes.

## Panier et commandes

- Conserver les options sélectionnées.
- Séparer deux variantes d'un même produit
  en deux lignes différentes.
- Permettre la modification des options au panier.
- Tenir compte du prix des options.
- Enregistrer les options et les prix
  avec les lignes de commande.

## Points de vigilance

- Ne pas mélanger les stocks des variantes.
- Ne pas perdre les options dans localStorage.
- Ne pas perdre les options à la commande.
- Préserver le fonctionnement du panier.

## Vérifications

Tester au minimum :
- Deux variantes différentes d'un produit.
- Une variante indisponible.
- Un changement d'option.
- Le calcul des prix.
- La conservation des options à la commande.
## Correctifs du 22/10/2026

Révisions des stocks, prix, variantes, catalogue et optimisations : [référence partagée](../back-office/references/corrections-audit-2026-10-22.md).
