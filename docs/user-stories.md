
# User Stories — Boutique OM (SAÉ 3.01)

## Objectif

Ce document contient les exigences des prochaines user stories
du projet Boutique OM, issues du sujet officiel de la SAÉ 3.01.

À consulter uniquement pour l'US en cours de développement.
L'ordre de réalisation et les justifications sont dans README.md.

## US déjà implémentées

État déclaré au 20/10/2026, validation complète non garantie.

- DEC-B, DEC-C, DEC-A : Catalogue et navigation.
- CMD-B, CMD-C, CMD-A : Panier, compte et commandes.
- OPT-C, OPT-B, OPT-A : Options et variantes.
- STK-B, STK-C : Affichage et contraintes de stock.

Préserver ces fonctionnalités lors des nouvelles US.

---

## Definition of Done commune

Chaque US doit respecter les exigences suivantes :

1. Code versionné sur GitHub dans une branche dédiée,
   avec des commits explicites et fusion dans la branche principale.
   Les opérations Git sont exclusivement gérées par Mag.
2. HTML et CSS valides selon les validateurs W3C.
3. Interface conforme à la charte graphique OM et responsive
   sur mobile, tablette et desktop.
4. Fonctionnement testé sur trois navigateurs différents.
5. Formulaires validés côté client et côté serveur,
   avec des messages d'erreur clairs en français.
6. Pages et actions réservées inaccessibles
   aux utilisateurs sans les droits nécessaires.

Une US est terminée uniquement lorsque ses critères
d'acceptation et ses Definition of Done sont respectés.

---

# Étape 4 — Gérer l'offre

## GOF-B — Back-office

**Objectif :**
En tant qu'administrateur, je veux accéder à un back-office
sécurisé afin de gérer le site.

**Dépendances :** aucune US bloquante.

### Critères d'acceptation

- J'accède au back-office par une URL dédiée `/admin`.
- L'authentification des administrateurs est séparée
  de celle des clients.
- La page d'accueil du back-office affiche quelques
  indicateurs simples (nombre de produits, nombre de commandes).
- J'ai une navigation claire entre les sections d'administration.
- Le design est cohérent avec le front-office mais distinct.

### Definition of Done spécifique

- Compte administrateur de test en base de données.
- Aucune page `/admin` n'est accessible sans
  authentification administrateur.

### Points de vigilance

- Réutiliser l'architecture existante.
- Ne pas casser l'authentification client CMD-C.
- Protéger les routes et actions côté serveur.
- Consulter les maquettes Figma pertinentes.

---

## GOF-C — Gestion des catégories

**Objectif :**
En tant qu'administrateur, je veux gérer les catégories
afin d'organiser le catalogue.

**Dépendances :** GOF-B, DEC-B.

### Critères d'acceptation

- Je peux créer de nouvelles catégories avec nom et description.
- Je peux modifier les catégories existantes.
- Je peux supprimer une catégorie en gérant les produits
  qui lui sont rattachés.
- Je dois confirmer avant toute suppression.
- La validation empêche les données incohérentes.

### Definition of Done spécifique

- CRUD complet des catégories.
- Règle explicite pour les produits d'une catégorie
  supprimée : réaffectation ou blocage de la suppression.

### Points de vigilance

- Réutiliser les catégories déjà présentes.
- Préserver les URLs et filtres de DEC-A.
- Réserver les modifications aux administrateurs.

---

## GOF-A — Gestion des produits

**Objectif :**
En tant qu'administrateur, je veux gérer les produits
afin de maintenir le catalogue à jour.

**Dépendances :** GOF-B, GOF-C, DEC-B.
Fonctionnalités liées : STK-B, OPT-C, OPT-B.

### Critères d'acceptation

- Je peux ajouter de nouveaux produits avec
  toutes leurs informations.
- Je peux modifier tous les aspects d'un produit existant.
- Je peux supprimer des produits, après confirmation.
- Je peux téléverser et gérer les images des produits.
- Je peux fixer les prix et les stocks.
- Je peux modifier le seuil d'alerte « Bientôt épuisé ».
- Si les produits ont des options, je peux définir
  les options disponibles pour chaque produit.

### Definition of Done spécifique

- CRUD complet des produits.
- Gestion des images (téléversement, redimensionnement).

### Points de vigilance

- Réutiliser le catalogue DEC-B.
- Préserver les fiches produit DEC-C.
- Conserver les options et variantes déjà implémentées.
- Respecter le stock par variante.
- Protéger les modifications côté serveur.

---

# Étape 5 — Traiter et piloter l'activité

## PIL-B — Gestion des commandes

**Objectif :**
En tant qu'administrateur, je veux gérer les commandes
afin de suivre et traiter les ventes.

**Dépendances :** CMD-A, GOF-B.
Fonctionnalité liée : STK-A.

### Critères d'acceptation

- Je vois la liste de toutes les commandes des clients.
- Je peux trier les commandes par date, statut ou montant.
- Je peux faire passer une commande de « en cours »
  à « disponible » puis à « retirée ».
- Je peux annuler une commande tant qu'elle n'est pas retirée.
- L'annulation remet en stock les produits de la commande.
- Les autres changements de statut ne modifient pas le stock.
- Je peux accéder au détail complet de chaque commande.
- Je peux effectuer des actions en lot sur plusieurs commandes.

### Definition of Done spécifique

- Confirmation demandée avant toute annulation.
- Journal des modifications effectuées par les administrateurs.

### Points de vigilance

- Réutiliser les commandes enregistrées dans CMD-A.
- Réserver toutes les actions aux administrateurs.
- STK-A est prévue à l'étape 6 : préparer son intégration.
- La restauration du stock à l'annulation est obligatoire
  pour valider complètement PIL-B.

---

## PIL-A — Tableaux de bord statistiques

**Objectif :**
En tant qu'administrateur, je veux consulter
des statistiques afin de piloter l'activité.

**Dépendances :** GOF-B, CMD-A, PIL-B, STK-B.

### Critères d'acceptation

- Je vois un graphique des stocks par produit (histogramme).
- Je vois les revenus des 7 derniers jours.
- Je vois les statistiques des commandes (nombre, statuts).
- Je vois les produits les plus vendus.
- Je suis alerté des stocks faibles.

### Definition of Done spécifique

- Données à jour à chaque consultation.
- Export des statistiques.

### Points de vigilance

- Utiliser les données réelles du projet.
- Réutiliser les commandes et stocks existants.
- Ne pas afficher de statistiques inventées.
- Réserver le tableau de bord aux administrateurs.

---

# Étape 6 — Garantir la disponibilité (fin)

## STK-A — Mise à jour automatique des stocks

**Objectif :**
En tant que système, je veux mettre à jour
automatiquement les stocks afin de maintenir leur cohérence.

**Dépendances :** CMD-A, PIL-B.
Fonctionnalités liées : OPT-B, STK-B, STK-C.

### Critères d'acceptation

- Le stock est décrémenté à la validation d'une commande.
- Le stock est recrédité lorsqu'une commande
  passe au statut « annulée ».
- Aucun autre changement de statut d'une commande
  ne modifie le stock.
- Les mises à jour sont atomiques (tout ou rien).
- Un journal des mouvements de stock est tenu.
- Un stock ne peut jamais devenir négatif.
- Si les produits ont des variantes,
  la mise à jour se fait par variante.

### Definition of Done spécifique

- Transactions en base de données, avec annulation
  (rollback) en cas d'erreur.
- Journal complet des mouvements de stock.
- Test de concurrence : deux commandes simultanées
  portant sur la dernière unité d'un produit.

### Points de vigilance

- Réutiliser les variantes de OPT-B.
- Préserver les contraintes existantes de STK-C.
- Empêcher toute décrémentation en double.
- Empêcher toute restauration en double.
- Vérifier la cohérence en base de données.
- Tester les cas de concurrence.

---

# Étape 7 — Suivre mes achats

## SUI-B — Espace personnel

**Objectif :**
En tant que client connecté, je veux accéder
à mon espace personnel afin de gérer mes informations.

**Dépendances :** CMD-C.
Fonctionnalité liée : CMD-A pour les commandes récentes.

### Critères d'acceptation

- J'accède à une page d'accueil personnalisée.
- Je vois mes informations personnelles.
- Je peux modifier mon profil (nom, email, mot de passe).
- J'ai une navigation intuitive dans mon espace.
- Je suis redirigé vers la connexion si je ne suis pas connecté.
- Je vois un aperçu de mon activité (commandes récentes).

### Definition of Done spécifique

- La modification du mot de passe exige
  le mot de passe actuel.

### Points de vigilance

- Réutiliser l'authentification CMD-C.
- Protéger les données personnelles.
- Vérifier les droits côté serveur.
- Préserver les sessions existantes.

---

## SUI-C — Historique des commandes

**Objectif :**
En tant que client connecté, je veux consulter
l'historique de mes commandes afin de suivre mes achats.

**Dépendances :** CMD-A, SUI-B.
Fonctionnalités liées : PIL-B, OPT-A.

### Critères d'acceptation

- Je vois la liste de toutes mes commandes par date décroissante.
- Le statut de chaque commande est visible :
  « en cours », « disponible », « retirée », « annulée ».
- Je vois le montant total de chaque commande.
- Je peux accéder au détail de chaque commande.
- Je peux filtrer par statut ou par période.
- Si les produits ont des options,
  les options choisies sont visibles.

### Definition of Done spécifique

- Pagination si nécessaire.

### Points de vigilance

- Un client ne peut consulter que ses propres commandes.
- Réutiliser les informations enregistrées dans CMD-A.
- Conserver l'affichage des options de OPT-A.
- Afficher correctement les statuts modifiés par l'admin.

---

## SUI-A — Réutilisation des commandes

**Objectif :**
En tant que client connecté, je veux réutiliser
mes anciennes commandes afin de gagner du temps.

**Dépendances :** SUI-C, CMD-B, STK-C.
Fonctionnalité liée : OPT-A.

### Critères d'acceptation

- Je peux cliquer sur « Commander à nouveau »
  depuis l'historique.
- Les produits de la commande sont transférés dans mon panier.
- La disponibilité est vérifiée avant le transfert.
- Je suis informé si des produits ne sont plus disponibles.
- Si les produits ont des options,
  les options choisies à l'époque sont conservées.
- Je reçois un message de confirmation du transfert.

### Definition of Done spécifique

- Gestion des produits supprimés ou modifiés
  depuis la commande.

### Points de vigilance

- Réutiliser le panier existant CMD-B.
- Respecter les contraintes de stock STK-C.
- Préserver les options et variantes.
- Vérifier les disponibilités actuelles.
- Ne pas réutiliser aveuglément les anciens prix.

---

## Consignes pour l'agent

Lorsqu'une US est demandée :

1. Lire uniquement sa section dans ce document.
2. Consulter les dépendances dans README.md.
3. Consulter les règles pertinentes dans .agents/rules/.
4. Identifier les fonctionnalités existantes à préserver.
5. Consulter les maquettes Figma pertinentes si nécessaire.
6. Utiliser le skill nouvelle-us pour préparer le travail.
7. Proposer un plan et attendre la validation avant de coder.
8. Utiliser verifier-us pour contrôler la Definition of Done.

Ne jamais déclarer une US terminée sans vérification.
Ne jamais exécuter de commande Git : Git est géré par Mag.
