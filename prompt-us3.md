utilise le skill ponytail

AVANT TOUT : lis AGENTS.md en entier, puis le dossier .agents/ (rules/charte-om.md, rules/metier.md, rules/securite.md, skills/nouvelle-us, skills/verifier-us, workflows/terminer-us.md) et README.md. Suis leurs règles à la lettre (réponse en français et courte, donne un plan court et attends mon « fais » avant d'écrire du code, ne modifie que ce qui est demandé, ne touche pas à front/dist, pas de branche Git : le dossier n'est pas un dépôt). À la fin, liste tous les fichiers créés/modifiés avec leur chemin complet et dis-moi ce que tu as lu.

réalise l'user storie 3
respecte la structure du projet et du code deja existant, lis agents.md


```
.htaccess            /api/... vers le back, tout le reste vers front/dist/
sql/import.sql       tables film et genre, à importer dans votre base
back/                API PHP, ne renvoie que du JSON
├── index.php        point d'entrée : assemble les dépendances, délègue
├── config/          identifiants de la base, chemin du projet
└── src/             Core/ (Request, Response, Router, Database),
                     Controller/, Model/, routes.php
front/               sources du front (Vite + Tailwind)
├── index.html       page unique de l'application
├── vite.config.js   chemin du projet, proxy de développement
├── src/
│   ├── main.js      déclaration des routes et des layouts
│   ├── global.css   Tailwind, thème sombre
│   ├── layouts/     structures de page (en-tête + slot de la page)
│   ├── pages/       une page par route : page.js + template.html
│   ├── ui/          composants réutilisables : index.js + template.html
│   ├── data/        appels à l'API, un module par ressource
│   └── lib/         routeur, rendu des templates, requêtes, utilitaires
└── dist/            résultat de npm run build (non versionné)
```

SAé 3.01 | Intégrer/développer des interfaces/parcours utilisateurs au sein d’un système d’information
Trouver une enseigne : Boutique Olympique de marseille
Tableau des dépendances entre les user stories
User story
Epic
A beson de
Pourquoi
DEC-b Catalogue
Découvrir l'offre
Aucune
C'est la base : les produits doivent exister en base pour être affichés.
DEC-a Catégories
Découvrir l'offre
DEC-b
On filtre des produits déjà affichés et rattachés à une catégorie.
DEC-c Détail d'un produit
Découvrir l'offre
DEC-b
Une fiche s'ouvre à partir d'un produit du catalogue.
CMD-c Authentification
Commander
Aucune
Les comptes clients ne dépendent pas des produits.
CMD-b Panier
Commander
DEC-b (DEC-c pour l'ajout depuis la fiche)
Il faut des produits à ajouter au panier.
CMD-a Validation de commande
Commander
CMD-b, CMD-c
Il faut un panier à valider et un client connecté.
STK-b Affichage des stocks
Garantir la disponibilité
DEC-b
Le stock est un champ du produit, affiché sur le catalogue et les fiches.
STK-c Contraintes de stock
Garantir la disponibilité
STK-b, CMD-b, CMD-a
Elle limite les quantités du panier et reverifie le stock à la validation.
STK-a Mise à jour des stocks
Garantir la disponibilité
CMD-a, PIL-b
Le stock baisse à la validation d'une commande et remonte à l'annulation.
GOF-b Back-office
Gérer l'offre
Aucune
Zone séparée avec sa propre authentification.
GOF-c Gestion des catégories
Gérer l'offre
GOF-b, DEC-b
Elle se fait dans le back-office et agit sur les catégories du catalogue.
GOF-a Gestion des produits
Gérer l'offre
GOF-b, GOF-c, DEC-b (STK-b pour le seuil, OPT-c pour les options)
Un produit appartient à une catégorie et se gère depuis le back-office.
OPT-c Choix des options
Personnaliser son produit
DEC-c, CMD-b
Les options s'affichent sur la fiche produit et partent dans le panier.
OPT-a Options dans le panier et les commandes
Personnaliser son produit
OPT-c, CMD-b, CMD-a
Le panier et la commande doivent conserver les options choisies.
OPT-b Variantes et stock par variante
Personnaliser son produit
OPT-c (modifie STK-a, STK-b et STK-c)
Chaque combinaison d'options devient une variante avec son propre stock. Si les stocks existent déjà, il faut les migrer.
SUI-b Espace personnel
Suivre mes achats
CMD-c (CMD-a pour les commandes récentes)
Il faut un client connecté. L'aperçu des commandes récentes suppose des commandes enregistrées.
SUI-c Historique des commandes
Suivre mes achats
CMD-a, SUI-b (PIL-b pour les statuts, OPT-a pour les options)
Il liste des commandes enregistrées, depuis l'espace personnel.
SUI-a Réutilisation des commandes
Suivre mes achats
SUI-c, CMD-b, STK-c (OPT-a pour les options)
Le bouton part de l'historique, remplit le panier et vérifie le stock.
PIL-b Gestion des commandes
Traiter et piloter l'activité
CMD-a, GOF-b
Il faut des commandes à traiter, depuis le backoffice.
PIL-a Statistiques
Traiter et piloter l'activité
GOF-b, CMD-a, PIL-b, STK-b
regroupe commandes, statuts et stocks dans le backoffice.
Ordre de réalisation
Étape 1 : Découvrir l’offre + Commander
DEC-B, puis DEC-C, DEC-A, CMD-B, CMD-C, CMD-A.
Résultat : un site de base complet avec les produits, catégories, panier, compte
et commande
Étape 2 : Personnaliser son produit
OPT-C, puis OPT-B, OPT-A.
Résultat : options et variantes.
Étape 3 : Garantir la disponibilité (1/2)
STK-B, puis STK-C.
Résultat : affichage et blocage du stock.
Étape 4 : Gérer l’offre
GOF-B, puis GOF-C, GOF-A.
Résultat : back-office pour gérer catégories et produits.
Étape 5 : Traiter et piloter l’activité
PIL-B, puis PIL-A.
Résultat : gestion des commandes et statistiques.
Étape 6 : Garantir la disponibilité (2/2)
STK-A.
Résultat : mise à jour automatique du stock.
Étape 7 : Suivre mes achats
SUI-B, puis SUI-C, SUI-A.
Résultat : espace client, historique, recommander une commande.
Justification
Je fais les options avant le stock. Le stock se compte par taille ou par couleur. Si je faisais le stock d’abord, je devrais le refaire en ajoutant les options. En commençant par les options, je ne le fais qu’une fois.
J’affiche le stock et je bloque les commandes trop grandes (STK-B, STK-C). Il me faut seulement les produits et les commandes, déjà faits.
Je fais le début de l’espace admin (GOF-B, GOF-C). Il n’a presque besoin de rien, et il sert à gérer les commandes juste après.
L’admin gère les commandes (PIL-B). Il faut que des commandes existent (site de base) et que l’espace admin soit prêt (étape 3).
Je fais la mise à jour automatique du stock (STK-A). Elle a besoin de l’annulation de commande, qui vient d’être faite, et elle termine toute la partie stock. C’est la plus difficile, donc je la fais quand tout le reste fonctionne.
Je finis la gestion des produits (GOF-A). Elle gère les options et le stock, donc ces deux parties doivent exister déjà.
Je fais les statistiques (PIL-A). Elles ont besoin des commandes et du stock, et ne bloquent rien : je les fais quand tout est prêt.
Je fais l’espace client (SUI-B, SUI-C, SUI-A). Il a besoin de presque tout le reste (commandes, options, stock), donc il vient à la fin.
Analyse de l’existant : OM | Boutique Officielle de Marseille
Analyse du site en lui même
Menu en 7 rubriques Nouveautés, Tenues de match, Vestiaire joueurs, Pré-match & Training, Lifestyle, Enfant, Supporters & Cadeaux, plus Promotions.
Page d’accueil très chargée : bandeau défilant carrousels de nouveautés.
Fiches produit avec les tailles affichées directement sur la carte, les prix barrés avec pourcentage (-30 %, -50 %) et la mention « En rupture ».
Services : connexion, recherche, liste de souhaits, panier, 3 langues, guide des tailles, carte cadeau, satisfait ou remboursé.
Points fort
Le choix est très riche, les visuels sont de qualité et on ressent directement l'ambiance du club.
Les tailles sont visibles facilement et les choix de personnalisation sont simples d’utilisation.
Point faibles
Le sous menu des différentes rubriques est trop chargé, trop profond, le vestiaire joueurs affiche tout l’effectif uniquement dans le menu
Pas de proposition visible de retrait en magasin alors que l’om possède des boutiques physiques
Différence à faire
Mettre au centre le parcours de retrait en magasin
Simplifier la navigation ( moins de rubriques)
Rendre le stock directement accessible sans avoir à cliquer sur la fiche produit
PARCOURS UTILISATEURS
Parcours 1 : le visiteur
But : trouver un produit.
Il arrive sur l’accueil.
Il choisit une catégorie.
Il voit les produits avec leur stock.
Il ouvre une fiche produit et choisit sa taille et son flocage.
Il ajoute le produit au panier.
Parcours 2 : le client connecté
But : commander et retirer en boutique.
Il ouvre son panier.
Il se connecte ou crée un compte.
Il vérifie sa commande et choisit sa boutique.
Il confirme et reçoit son numéro de commande.
Il suit ses commandes dans son espace personnel.
Il peut recommander une ancienne commande.
Parcours 3 : l’administrateur
But : gérer le site et les commandes.
Il se connecte à l’espace admin.
Il voit le tableau de bord.
Il gère les catégories et les produits.
Il traite les commandes : il change leur statut ou les annule.
Il consulte les statistiques.
IUT du Limousin / Département MMI / BUT2
SAé 3.01 | Intégrer/développer des interfaces/parcours utilisateurs au sein d’un système d’information
Compétences ciblées
Comprendre les écosystèmes, les besoins des utilisateurs et les dispositifs de communication numérique Concevoir ou co-concevoir une réponse stratégique pertinente à une problématique complexe Développer pour le web et les médias numériques Entreprendre dans le secteur du numérique
Objectifs et problématique professionnelle
Objectifs : combiner les ressources liées au développement web, au design d’expérience et à la gestion de projet pour concevoir et développer des parcours utilisateurs.
En tant que développeurs web et UX-designers, les étudiants doivent analyser le cahier des charges d'une application ou d'un site web, identifier les parcours utilisateurs, avant d'en développer les fonctionnalités en répondant à la question : Comment mettre en place un site web offrant une expérience utilisateur de qualité ?
Les étudiants du parcours "Création Numérique" doivent modéliser le système d'information et ses fonctionnalités, en réaliser une maquette interactive, puis utiliser un système de gestion de contenus pour mettre en place les parcours utilisateurs définis. Ils porteront une attention particulière à la mise en page des interfaces intégrées et à leur adaptabilité (aspects "responsive").
Les étudiants du parcours "Développement web et dispositifs interactifs" doivent développer par eux-mêmes le système d'information et les traitements liés aux parcours utilisateurs définis, en mettant l'accent sur la qualité du code produit.
Ressources mobilisées et combinées
Tronc commun :
[R3.03 | Design d'expérience](https://orebut.iut.fr/but/fiche-ressource/1592) [R3.04 | Culture numérique](https://orebut.iut.fr/but/fiche-ressource/1593) [R3.12 | Intégration R3.19 | Développement Front](https://orebut.iut.fr/but/fiche-ressource/1603)
[R3.14 | Déploiement de services](https://orebut.iut.fr/but/fiche-ressource/1606) [R3.16 | Gestion de projet](https://orebut.iut.fr/but/fiche-ressource/1608) [R3.17 | Economie, gestion et droit du numérique](https://orebut.iut.fr/but/fiche-ressource/1609)
[R3.18 | Projet Personnel et Professionnel](https://orebut.iut.fr/but/fiche-ressource/1610)
Création Numérique : [R3.Crea.13 | Gestion de contenus avancée](https://orebut.iut.fr/but/fiche-ressource/1605)
Développeur Web et Dispositifs Interactifs [R3.DWeb-DI.13 | Développement Back](https://orebut.iut.fr/but/fiche-ressource/1604)

1. Descriptif

Objectif :
Il s’agit de réaliser un site web de type “click & collect”.
Le site web doit donc proposer différents produits que l’on pourra sélectionner pour constituer un “panier” que chaque client pourra plus tard passer chercher ou commander.
Toutefois, dans le cadre de ce projet, le paiement et la mise à disposition du panier ne seront pas traités.
Le projet est individuel..
Chaque étudiant(e) choisira une enseigne différente.
Vous respecterez la charte graphique de l’enseigne choisie (il est primordial que votre enseigne ait une charte graphique riche et bien établie).
Les produits disponibles sur votre site seront à prendre parmi ceux vendus par l’enseigne choisie.
Si elle possède déjà un service “click & collect” ou tout simplement une boutique en ligne (ce sera sans doute le cas) vous devrez proposer une expérience utilisateur qui diffère de l’existant.
Pour vous simplifier la tâche, on ne vous demande pas de proposer sur votre site tous les produits vendus par l’enseigne. L’objectif sera d’avoir :

* minimum 3 catégories de produits
* minimum 4 produits par catégorie
* des “options” pour chaque produit (dans un second temps)

Bien entendu, si vous allez au-delà de cette attente, cela ne pourra être qu’à votre avantage.
Voici 2 exemples pour que ce soit bien clair :
Exemple n°1 :
Enseigne : Decathlon
Catégories de produits : Montagne, Sports en salle, Running
Produits :
Montagne > Chaussures / T-shirts / Pantalons / …
Sports en salle > Chaussures / Shorts / Chaussettes / …
Running > Chaussures / Coupe-vent / Gants / …
Options : (selon produit) tailles, couleurs…
Exemple n°2 :
Enseigne : Starbucks
Catégories de produits : Boissons, Sucré, Salé
Produits :
Boissons > Cappuccino / Mocha / Americano / …
Sucré > Croissants / Pancakes / Brownies / …
Salé > Sandwichs / Wraps / Bagels / …
Options : (selon produit) sans sucre, avec crème, avec caramel, double, chocolat au lait/noir …

2. Organisation de la SAé

Première semaine : Principalement, Analyse / Webdesign / Intégration
La première semaine sera consacrée à l’analyse de l’existant, la réflexion sur les parcours utilisateurs, le webdesign et la production de prototypes Figma aboutis (utilisez les variables, composants, variants…). Vous irez jusqu’à la production du HTML et CSS des divers composants de sorte à pouvoir les intégrer rapidement durant la phase de développement.
Dès le premier jour, vous analysez les user stories et établissez l’ordre dans lequel vous les réaliserez (voir partie 3). Cet ordre est présenté à vos enseignants à la fin de la première journée.
Deuxième semaine : Principalement, développement
La seconde semaine sera essentiellement consacrée au développement de votre site en suivant l’ordre de réalisation que vous avez établi. Une fois de plus, il est fortement recommandé d’amorcer le développement des premières user stories dès la première semaine.
Une base de code vous sera fournie pour développer votre projet.
Celui-ci fera l’objet d’un repository Github bien géré (soin dans la rédaction des commits, une branche par US etc…). L’intervention de M. Sinclair le premier jour de la SAE a pour objet de vous donner les bases nécessaire sur Git/Github.

3. Epics et user stories

3.1 Principe
Les user stories sont regroupées en epics. Un epic décrit un besoin global de l'utilisateur ; il est terminé lorsque toutes ses user stories sont réalisées.
Les epics sont présentés par ordre alphabétique et, à l'intérieur d'un epic, les user stories ne sont pas classées : l'ordre de présentation ne correspond pas à un ordre de réalisation.
Avant de développer, c'est à vous d'établir l'ordre dans lequel vous réaliserez les user stories. Pour cela :

* identifiez les dépendances entre user stories, à l'intérieur d'un même epic et d'un epic à l'autre ;
* représentez ces dépendances sous la forme d'un graphe ;
* déduisez-en un ordre de réalisation et justifiez vos choix (dépendances techniques, valeur pour l'utilisateur, complexité, risque de devoir reprendre du code déjà écrit).

Il n'existe pas un ordre unique : plusieurs ordres sont défendables et c'est la qualité de votre justification qui sera évaluée. Vous présenterez votre analyse à vos enseignants à la fin de la première journée, puis vous la placerez dans le README de votre dépôt.
L'epic « Promotions » est un bonus.
3.2 Definition of Done commune
Une user story n'est terminée que si, en plus de ses critères d'acceptation et de sa Definition of Done spécifique, elle respecte les points suivants :

* le code est versionné sur GitHub dans une branche dédiée à la user story, avec des commits explicites, puis fusionné dans la branche principale ;
* le HTML et le CSS sont valides (validateur du W3C) ;
* l'interface respecte la charte graphique de l'enseigne et est responsive (mobile, tablette, desktop) ;
* le fonctionnement est testé sur 3 navigateurs différents ;
* les formulaires sont validés côté client et côté serveur, avec des messages d'erreur clairs et en français ;
* les pages et actions réservées sont inaccessibles aux utilisateurs qui n'ont pas les droits nécessaires.

3.3 Epic « Commander en click & collect »
Objectif : en tant que client, je veux constituer un panier et valider ma commande afin de la retirer en magasin.
Terminé quand : un visiteur peut remplir un panier, s'identifier et obtenir une commande enregistrée avec un numéro unique.
CMD-a : Validation de commande
En tant que client connecté, je veux valider ma commande afin de finaliser mon achat
Critères d'acceptation :

* Je suis redirigé vers la connexion si je ne suis pas connecté
* Je vois un récapitulatif complet avant validation
* Je confirme ma commande par un clic explicite
* Ma commande est enregistrée avec un numéro unique et le statut « en cours »
* Mon panier est vidé après validation
* Je reçois une confirmation de commande claire

Definition of Done spécifique :

* Génération de numéros de commande uniques
* Sauvegarde complète en base de données (commande et lignes de commande, avec le prix de chaque produit au moment de la commande)
* Page de confirmation de qualité professionnelle
* Test de bout en bout du processus de commande

CMD-b : Panier d'achat
En tant que client, je veux ajouter des produits à un panier afin de préparer ma commande
Critères d'acceptation :

* Je peux ajouter des produits depuis le catalogue et depuis les pages détail
* Une icône panier avec compteur d'articles est visible
* Je peux consulter mon panier (liste des produits)
* Je peux modifier les quantités dans le panier
* Je peux supprimer des articles du panier
* Les totaux se calculent automatiquement
* Mon panier est sauvegardé localement et restauré d'une visite à l'autre

Definition of Done spécifique :

* Panier persistant en local (stockage du navigateur)
* Totaux recalculés à chaque modification du panier

CMD-c : Authentification
En tant que visiteur, je veux créer un compte et me connecter afin de pouvoir finaliser mes achats
Critères d'acceptation :

* Je peux créer un compte avec email et mot de passe
* Je peux me connecter avec mes identifiants
* Je peux me déconnecter
* Mon mot de passe est stocké de manière sécurisée
* Je reçois des messages d'erreur clairs en cas de problème
* Ma session est maintenue lors de la navigation

Definition of Done spécifique :

* Hashage sécurisé des mots de passe (bcrypt ou équivalent)
* Gestion sécurisée des sessions (identifiant de session régénéré à la connexion)

3.4 Epic « Découvrir l'offre »
Objectif : en tant que visiteur, je veux parcourir l'offre de l'enseigne afin de trouver les produits qui m'intéressent.
Terminé quand : un visiteur peut aller du catalogue à n'importe quelle fiche produit en passant par les catégories, sur mobile comme sur desktop.
DEC-a : Navigation par catégories
En tant que visiteur, je veux filtrer les produits par catégorie afin de trouver plus facilement ce qui m'intéresse
Critères d'acceptation :

* Je vois un menu de navigation avec les catégories
* Je peux cliquer sur une catégorie pour voir uniquement ses produits
* Le nombre de produits par catégorie est affiché
* Un bouton « Tous les produits » me permet de réinitialiser le filtre
* L'URL change selon la catégorie sélectionnée

Definition of Done spécifique :

* Filtrage fonctionnel (en JavaScript ou par rechargement de la page)
* URLs propres (/categorie/nom-categorie)
* Fil d'Ariane ou indication visuelle de la catégorie active

DEC-b : Catalogue de produits
En tant que visiteur, je veux consulter le catalogue de produits afin de découvrir l'offre disponible
Critères d'acceptation :

* Je peux voir tous les produits
* Chaque produit affiche : nom, prix, image principale
* La page se charge en moins de 3 secondes

Definition of Done spécifique :

* Base de données initialisée avec les produits de test (au moins 3 catégories de 4 produits)

DEC-c : Détail d'un produit
En tant que visiteur, je veux consulter le détail d'un produit afin de prendre une décision d'achat éclairée
Critères d'acceptation :

* Je peux accéder à une page dédiée pour chaque produit
* Je vois une galerie d'images du produit
* Je peux lire une description détaillée
* Le prix est affiché clairement
* Un bouton « Ajouter au panier » est présent
* Je peux revenir facilement au catalogue

Definition of Done spécifique :

* URL propre pour chaque produit (/produit/nom-produit)
* Galerie d'images fonctionnelle (navigation entre les images)
* Métadonnées pour le SEO
* Retour vers la catégorie d'origine

3.5 Epic « Garantir la disponibilité »
Objectif : en tant que client, je veux que seuls les produits disponibles soient commandables afin de ne pas avoir de mauvaise surprise au retrait.
Terminé quand : il est impossible de commander au-delà du stock, et le stock reste exact après chaque commande et chaque annulation.
STK-a : Mise à jour automatique des stocks
En tant que système, je veux mettre à jour automatiquement les stocks afin de maintenir leur cohérence
Critères d'acceptation :

* Le stock est décrémenté à la validation d'une commande
* Le stock est recrédité lorsqu'une commande passe au statut « annulée »
* Aucun autre changement de statut d'une commande ne modifie le stock
* Les mises à jour sont atomiques (tout ou rien)
* Un journal des mouvements de stock est tenu
* Un stock ne peut jamais devenir négatif
* Si les produits ont des variantes, la mise à jour se fait par variante

Definition of Done spécifique :

* Transactions en base de données, avec annulation (rollback) en cas d'erreur
* Journal complet des mouvements de stock
* Test de concurrence : deux commandes simultanées portant sur la dernière unité d'un produit

STK-b : Affichage des stocks
En tant que client, je veux voir la disponibilité des produits afin de savoir si je peux les commander
Critères d'acceptation :

* Je vois l'état du stock sur chaque produit (« En stock », « Bientôt épuisé », « Épuisé »)
* Le seuil « Bientôt épuisé » est défini par une valeur de configuration (fichier ou table de paramètres)
* Le style visuel diffère selon l'état du stock
* L'état affiché correspond au stock réel au moment où la page est chargée
* Si les produits ont des variantes, je vois le stock par variante

Definition of Done spécifique :

* Champs de stock ajoutés à la base de données
* Tests avec différents niveaux de stock

STK-c : Contraintes de stock
En tant que client, je veux être limité par les stocks disponibles afin d'éviter les commandes impossibles
Critères d'acceptation :

* Je ne peux pas ajouter un produit épuisé au panier
* La quantité maximum est limitée au stock disponible
* Je reçois des messages d'erreur clairs en cas de dépassement
* Les quantités de mon panier s'ajustent automatiquement si nécessaire
* La vérification se fait avant chaque ajout au panier et à la validation de la commande
* Si les produits ont des variantes, les contraintes s'appliquent par variante

Definition of Done spécifique :

* Vérification côté client et côté serveur
* Gestion des cas limites (stock modifié pendant la session)
* Tests avec différents scénarios de stock

3.6 Epic « Gérer l'offre »
Objectif : en tant qu'administrateur, je veux maintenir le catalogue afin que l'offre en ligne reflète celle du magasin.
Terminé quand : un administrateur peut créer, modifier et retirer catégories et produits sans intervenir directement dans la base de données.
GOF-a : Gestion des produits
En tant qu'administrateur, je veux gérer les produits afin de maintenir le catalogue à jour
Critères d'acceptation :

* Je peux ajouter de nouveaux produits avec toutes leurs informations
* Je peux modifier tous les aspects d'un produit existant
* Je peux supprimer des produits, après confirmation
* Je peux téléverser et gérer les images des produits
* Je peux fixer les prix et les stocks
* Je peux modifier le seuil d'alerte « Bientôt épuisé »
* Si les produits ont des options, je peux définir les options disponibles pour chaque produit

Definition of Done spécifique :

* CRUD complet des produits
* Gestion des images (téléversement, redimensionnement)

GOF-b : Back-office
En tant qu'administrateur, je veux accéder à un back-office sécurisé afin de gérer le site
Critères d'acceptation :

* J'accède au back-office par une URL dédiée (/admin)
* L'authentification des administrateurs est séparée de celle des clients
* La page d'accueil du back-office affiche quelques indicateurs simples (nombre de produits, nombre de commandes)
* J'ai une navigation claire entre les sections d'administration
* Le design est cohérent avec le front-office mais distinct

Definition of Done spécifique :

* Compte administrateur de test en base de données
* Aucune page /admin n'est accessible sans authentification administrateur

GOF-c : Gestion des catégories
En tant qu'administrateur, je veux gérer les catégories afin d'organiser le catalogue
Critères d'acceptation :

* Je peux créer de nouvelles catégories avec nom et description
* Je peux modifier les catégories existantes
* Je peux supprimer une catégorie en gérant les produits qui lui sont rattachés
* Je dois confirmer avant toute suppression
* La validation empêche les données incohérentes

Definition of Done spécifique :

* CRUD complet des catégories
* Règle explicite pour les produits d'une catégorie supprimée (réaffectation ou blocage de la suppression)

3.7 Epic « Personnaliser son produit »
Objectif : en tant que client, je veux choisir les options de mes produits afin d'acheter exactement ce que je veux.
Terminé quand : un produit configuré peut être commandé et suivi de bout en bout, avec un stock géré par variante.
OPT-a : Options dans le panier et les commandes
En tant que client, je veux retrouver les options choisies dans mon panier et mes commandes afin d'être sûr d'obtenir ce que j'ai choisi
Critères d'acceptation :

* Les options choisies sont affichées pour chaque article du panier
* Un même produit commandé avec des options différentes apparaît sur des lignes distinctes
* Je peux modifier les options d'un article dans mon panier
* Les totaux tiennent compte du prix des options
* Les options sont enregistrées avec la commande et visibles dans le récapitulatif et la confirmation

Definition of Done spécifique :

* Les lignes de commande conservent les options et le prix au moment de la commande

OPT-b : Variantes et stock par variante
En tant que client, je veux que seules les combinaisons d'options disponibles me soient proposées afin de ne pas commander une variante épuisée
Critères d'acceptation :

* Chaque combinaison d'options correspond à une variante qui a son propre stock
* Les combinaisons inexistantes ou épuisées ne sont pas sélectionnables, ou sont clairement signalées
* Les règles de stock existantes (affichage, contraintes, mise à jour) s'appliquent par variante

Definition of Done spécifique :

* Modélisation des variantes en base de données
* Migration des données et du code existants vers ce modèle

OPT-c : Choix des options
En tant que client, je veux choisir les options d'un produit sur sa fiche afin de le personnaliser
Critères d'acceptation :

* Je vois les options disponibles sur la page produit (taille, couleur, etc.)
* Je peux sélectionner une combinaison d'options
* Le prix se met à jour selon mes choix
* Le bouton « Ajouter au panier » ajoute le produit avec les options choisies

Definition of Done spécifique :

* Modélisation des options en base de données (options définies par produit)
* Interface dynamique (JavaScript)

3.8 Epic « Suivre mes achats »
Objectif : en tant que client connecté, je veux retrouver mes informations et mes commandes afin de suivre et renouveler mes achats.
Terminé quand : un client peut gérer son profil, consulter ses commandes passées et en relancer une.
SUI-a : Réutilisation des commandes
En tant que client connecté, je veux réutiliser mes anciennes commandes afin de gagner du temps
Critères d'acceptation :

* Je peux cliquer sur « Commander à nouveau » depuis l'historique
* Les produits de la commande sont transférés dans mon panier
* La disponibilité est vérifiée avant le transfert
* Je suis informé si des produits ne sont plus disponibles
* Si les produits ont des options, les options choisies à l'époque sont conservées
* Je reçois un message de confirmation du transfert

Definition of Done spécifique :

* Gestion des produits supprimés ou modifiés depuis la commande

SUI-b : Espace personnel
En tant que client connecté, je veux accéder à mon espace personnel afin de gérer mes informations
Critères d'acceptation :

* J'accède à une page d'accueil personnalisée
* Je vois mes informations personnelles
* Je peux modifier mon profil (nom, email, mot de passe)
* J'ai une navigation intuitive dans mon espace
* Je suis redirigé vers la connexion si je ne suis pas connecté
* Je vois un aperçu de mon activité (commandes récentes)

Definition of Done spécifique :

* La modification du mot de passe exige le mot de passe actuel

SUI-c : Historique des commandes
En tant que client connecté, je veux consulter l'historique de mes commandes afin de suivre mes achats
Critères d'acceptation :

* Je vois la liste de toutes mes commandes par date décroissante
* Le statut de chaque commande est visible (« en cours », « disponible », « retirée », « annulée »)
* Je vois le montant total de chaque commande
* Je peux accéder au détail de chaque commande
* Je peux filtrer par statut ou par période
* Si les produits ont des options, les options choisies sont visibles

Definition of Done spécifique :

* Pagination si nécessaire

3.9 Epic « Traiter et piloter l'activité »
Objectif : en tant qu'administrateur, je veux suivre les commandes et l'activité afin d'organiser les retraits et d'anticiper le réassort.
Terminé quand : un administrateur peut faire passer une commande de « en cours » à « retirée », annuler une commande et consulter les indicateurs clés.
PIL-a : Tableaux de bord statistiques
En tant qu'administrateur, je veux consulter des statistiques afin de piloter l'activité
Critères d'acceptation :

* Je vois un graphique des stocks par produit (histogramme)
* Je vois les revenus des 7 derniers jours
* Je vois les statistiques des commandes (nombre, statuts)
* Je vois les produits les plus vendus
* Je suis alerté des stocks faibles

Definition of Done spécifique :

* Données à jour à chaque consultation
* Export des statistiques

PIL-b : Gestion des commandes
En tant qu'administrateur, je veux gérer les commandes afin de suivre et traiter les ventes
Critères d'acceptation :

* Je vois la liste de toutes les commandes des clients
* Je peux trier les commandes par date, statut ou montant
* Je peux faire passer une commande de « en cours » à « disponible » puis à « retirée »
* Je peux annuler une commande tant qu'elle n'est pas retirée
* L'annulation remet en stock les produits de la commande ; les autres changements de statut ne modifient pas le stock
* Je peux accéder au détail complet de chaque commande
* Je peux effectuer des actions en lot sur plusieurs commandes

Definition of Done spécifique :

* Confirmation demandée avant toute annulation
* Journal des modifications effectuées par les administrateurs

3.10 Epic « Promotions » (bonus)
Objectif : en tant que client, je veux bénéficier de réductions afin d'acheter à meilleur prix.
Terminé quand : une réduction, automatique ou par code, est appliquée correctement au total d'une commande.
PRO-a : Codes promotionnels
En tant que client, je veux utiliser des codes promo afin de bénéficier de réductions
Critères d'acceptation :

* Je peux saisir un code promo lors de la commande
* Le code est vérifié et la réduction (en pourcentage) est appliquée au total

PRO-b : Gestion des codes promo
En tant qu'administrateur, je veux gérer les codes promotionnels afin de contrôler les réductions
Critères d'acceptation :

* CRUD des codes promotionnels avec leur pourcentage
* Statistiques d'utilisation des codes

PRO-c : Promotions automatiques
En tant que client, je veux bénéficier de promotions automatiques afin d'économiser sur mes achats
Critères d'acceptation :

* Le produit dont le stock est le plus élevé est en promotion (-20 %)
* Les prix barrés et promotionnels sont affichés

4. Livrables

La SAé se termine vendredi 23 octobre 2026 :

* un lien Figma vers vos prototypes.
* un lien vers votre application hébergée ([mmi.unilim.fr](http://mmi.unilim.fr/)) et correspondant à la branche principale de votre repository Github.
* le lien GitHub vers le repository de votre projet (si repo privé, ne pas oublier d’ajouter vos enseignants en “collaborateur”).
* le rapport d’audit de votre application produit par l’outil Lighthouse
* le document d’analyse : graphe des dépendances entre user stories et ordre de réalisation retenu, avec sa justification (dans le README de votre dépôt)
* les accès pour un compte visiteur et le cas échéant un compte administrateur

En temps utile, nous vous communiquerons un formulaire à compléter pour fournir l’ensemble de ces informations.

5. Evaluation

Globalement, votre note sera le résultat de la quantité de travail réalisé (user stories réalisées) et de la qualité du travail réalisé (qualité des livrables, maîtrise des apprentissages mis en œuvre).
Clairement, il vaut mieux en faire un peu moins mais très bien que beaucoup mais mal. Clairement aussi, si vous en faites peu même très bien, ça ne “paiera” pas grand chose. Et bien sûr si vous faites tout et parfaitement bien alors vous accéderez à l’univers des notes stratosphériques.
Donc vous aurez compris qu’il n’y a pas de réponse universelle à la traditionnelle question : “Combien faut-il réaliser de user stories pour avoir la moyenne ?”. Voici toutefois quelques indications sur chaque évaluation :
5.1 Note quantitative :
La note quantitative est comprise entre 0 et 20. Elle dépend des user stories réalisées. Toutes ne représentent pas la même quantité de travail : chacune a un poids qui dépend de sa complexité. Ces poids ne vous sont pas communiqués, car estimer la complexité des user stories fait partie du travail d’analyse attendu.
5.2 Note qualitative :
La note qualitative est un pourcentage compris entre 0 (niveau de maîtrise inexistant) et 100% (niveau de maîtrise conforme aux attentes de la formation). La note qualitative tient compte de la qualité de votre application et de la qualité de sa réalisation.
Remarque : la note qualitative peut éventuellement dépasser 100% lorsque le niveau de maîtrise démontré va au-delà des attentes de la formation.
Qualité de l’application :
C’est le point de vue utilisateur. Et il est toujours tranché. La seule chose qui importe à l’utilisateur c’est que ça l’application réponde à son besoin, que tout fonctionne parfaitement et efficacement. Peu importe comment.

* Convaincant et votre base d’évaluation sera de 75%.

C’est convaincant si le résultat est de qualité professionnelle en tout point. Tout fonctionne très bien. Si des défauts existent, ils sont mineurs et aisément rectifiables.

* Mitigé et votre base d’évaluation sera de 50%.

C’est mitigé si le résultat est intéressant mais avec des défauts majeurs qui ne sont pas acceptables dans une optique professionnelle. Un défaut majeur reste rectifiable mais demandera un travail significatif.

* Insuffisant et votre base d’évaluation sera de 25%.

C’est insuffisant si le résultat n’est tout simplement pas utilisable et/ou ne répond pas à la demande. Les défauts sont alors critiques, trop de mauvais choix ou d’erreurs ont été faites pour envisager rectifier le tir sans reprendre le projet de zéro ou presque.
Qualité de la réalisation :
Ici c’est le “comment” que l’on va apprécier. Qualité de votre analyse, qualité de vos prototypes, qualité de vos développements (HTML/CSS, JS/PHP et/ou CMS), respect des normes et standards… autant d’éléments qui viendront moduler à la hausse ou à la baisse votre pourcentage initial.
5.2 Note globale :
Votre note globale est votre note quantitative pondérée par votre note qualitative.
Exemple :
Votre note quantitative est 15 et votre note qualitative est de 85%. Vous obtenez 15 x 0.85 = 12.75
mon figma : https://www.figma.com/design/O7MtemKsP8zw6wSXpBU5Hb/Untitled?node-id=70-1004&t=9AU6BUIONWUL0vGg-0
