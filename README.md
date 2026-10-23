# Analyse des user stories — Boutique OM

## Maquettes et graphe

- [Maquettes de la boutique — Figma](https://www.figma.com/design/3lUWqwCcXggFXDevx5eaQV/NGOM-Magueye---Boutique-OM?node-id=0-1&p=f&t=il6UBp4wDulwUzjB-0)
- [Graphe des dépendances — FigJam](https://www.figma.com/board/FTibXWFBqaQtwCkbnwJ6Za/NGOM-Magueye---Graphe?node-id=0-1&p=f&t=erl61JQQOxxorPru-0)

## Dépendances entre les user stories

| User story | Dépend de | Justification |
|---|---|---|
| DEC-B — Catalogue | Aucune | Les produits doivent exister avant d’être affichés. |
| DEC-A — Catégories | DEC-B | Les catégories filtrent les produits du catalogue. |
| DEC-C — Détail produit | DEC-B | La fiche s’ouvre depuis un produit du catalogue. |
| CMD-C — Authentification | Aucune | Les comptes clients sont indépendants du catalogue. |
| CMD-B — Panier | DEC-B ; DEC-C pour l’ajout depuis une fiche | Le panier doit pouvoir recevoir des produits. |
| CMD-A — Validation de commande | CMD-B, CMD-C | Il faut un panier et un client connecté. |
| STK-B — Affichage des stocks | DEC-B | Le stock est affiché avec les produits. |
| STK-C — Contraintes de stock | STK-B, CMD-B, CMD-A | Les limites s’appliquent au panier et sont revérifiées à la commande. |
| STK-A — Mise à jour automatique du stock | CMD-A, PIL-B | Le stock est décrémenté à la commande et restauré à l’annulation. |
| GOF-B — Back-office | Aucune | L’administration possède son accès séparé. |
| GOF-C — Gestion des catégories | GOF-B, DEC-B | Les catégories sont gérées dans le back-office et alimentent le catalogue. |
| GOF-A — Gestion des produits | GOF-B, GOF-C, DEC-B | La gestion des produits s’appuie sur les catégories ; les options et seuils de stock s’ajoutent avec OPT-C et STK-B. |
| OPT-C — Choix des options | DEC-C, CMD-B | Les options sont choisies sur la fiche puis ajoutées au panier. |
| OPT-B — Variantes et stock par variante | OPT-C | Les variantes reposent sur les options et modifient la gestion du stock. |
| OPT-A — Options dans le panier et les commandes | OPT-C, CMD-B, CMD-A | Les options choisies doivent être conservées du panier à la commande. |
| SUI-B — Espace personnel | CMD-C ; CMD-A pour les commandes récentes | L’espace est réservé au client connecté et peut afficher ses commandes. |
| SUI-C — Historique des commandes | CMD-A, SUI-B | L’historique affiche les commandes du client ; PIL-B et OPT-A apportent les statuts et options. |
| SUI-A — Réutilisation des commandes | SUI-C, CMD-B, STK-C | La commande est reprise depuis l’historique, avec contrôle du stock et conservation des options OPT-A. |
| PIL-B — Gestion des commandes | CMD-A, GOF-B | L’administrateur traite les commandes enregistrées. |
| PIL-A — Statistiques | GOF-B, CMD-A, PIL-B, STK-B | Le tableau de bord rassemble commandes, statuts et stocks. |

## Ordre de réalisation retenu

1. **Découvrir l’offre et commander :** DEC-B, DEC-C, DEC-A, CMD-B, CMD-C, CMD-A.  
   Cela fournit le catalogue, la navigation, le panier, les comptes et la commande.

2. **Personnaliser les produits :** OPT-C, OPT-B, OPT-A.  
   Les options et variantes sont définies avant leur prise en compte dans le stock et les commandes.

3. **Garantir la disponibilité — première partie :** STK-B, STK-C.  
   Le client voit le stock et ne peut pas dépasser les quantités disponibles.

4. **Gérer l’offre :** GOF-B, GOF-C, GOF-A.  
   Le back-office permet ensuite de gérer les catégories et les produits, avec leurs options et seuils de stock.

5. **Traiter et piloter l’activité :** PIL-B, PIL-A.  
   Les commandes existantes peuvent être traitées, puis exploitées dans les statistiques.

6. **Garantir la disponibilité — seconde partie :** STK-A.  
   La décrémentation et la restauration automatiques s’appuient sur la validation et l’annulation des commandes.

7. **Suivre les achats :** SUI-B, SUI-C, SUI-A.  
   L’espace client, l’historique et la réutilisation s’appuient sur les commandes, leurs options et les contrôles de stock déjà en place.

## Justification générale

Les options et les variantes précèdent la gestion finale du stock, celui-ci dépend notamment des tailles et des autres choix du client. Le stock visible et ses limites sont ensuite mis en place avant les outils d’administration. Le traitement des commandes précède la mise à jour automatique du stock, car l’annulation doit pouvoir restaurer les quantités. Enfin, l’espace client vient après les parcours de commande, afin de réutiliser les données réellement enregistrées.

## Audit Lighthouse

Scores visibles sur la capture du 22 octobre 2026 :

| Performance | Accessibilité | Bonnes pratiques | SEO |
|---:|---:|---:|---:|
| 75 | 100 | 100 | 100 |


