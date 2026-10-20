# GOF-B — Back-office

Cette référence conserve la mise en place et les vérifications de GOF-B.
La description des sections « à venir » ci-dessous correspond à cette étape ;
les catégories et produits ont depuis été implémentés dans GOF-C et GOF-A.

L'entrée `/admin` présente la connexion administrateur. Le contenu privé et
les sections `/admin/categories`, `/admin/produits`, `/admin/commandes` et
`/admin/statistiques` ne s'affichent qu'après cette connexion.
Ces quatre sections annoncent les développements à venir ; GOF-B fournit
seulement le tableau de bord avec les nombres réels de produits et de commandes.

En développement :
[ouvrir l'administration locale](http://localhost:5173/~ngom14/SAE301-Starter-main/SAE301-Starter-main/admin).
Le pied de page de la boutique contient maintenant un lien « Administration ».
Le front Vite utilise l'API de l'IUT par son proxy ; `localhost` ne désigne donc
pas une base MySQL locale pour cette application.

Les styles admin utilisent exclusivement les classes utilitaires Tailwind.
`global.css` conserve les polices, les variables existantes et les valeurs Figma
dans `@theme` ; le bloc de sélecteurs CSS admin ajouté initialement a été retiré.

## Compte administrateur de test

Le 20 octobre 2026, Mag a confirmé qu'un compte administrateur existe déjà et
que la connexion fonctionne. Ce compte est conservé, sans changer son mot de passe.
Le script ci-dessous reste disponible uniquement si un autre compte de test est nécessaire.

Depuis la racine, sur la machine ayant accès à la base configurée :

```powershell
$env:OM_ADMIN_TEST_PASSWORD = 'Un-mot-de-passe-test-a-choisir'
php back/scripts/create-admin.php admin.test@boutique-om.local
Remove-Item Env:OM_ADMIN_TEST_PASSWORD
```

Le script utilise bcrypt. Il ne réimporte aucune table, ne transforme pas un
client en administrateur et ne remplace pas un compte ni un mot de passe existant.
Le mot de passe ne doit pas être conservé dans le dépôt.

## Sessions et sécurité

- Les routes `/api/admin/*` utilisent le cookie `OMADMINSESSID`, indépendant du
  cookie client `PHPSESSID`, avec `Secure`, `HttpOnly`, `SameSite=Lax` et un
  chemin limité à l'API admin.
- L'identifiant de session admin est régénéré à la connexion.
- Toute route API admin est protégée, sauf la connexion, l'état de session
  et la déconnexion. Les requêtes de modification exigent du JSON ; les
  requêtes signalées comme provenant d'un autre site sont refusées.
- Les réponses admin ne sont pas mises en cache. La déconnexion admin
  conserve la connexion client et le panier.
- Le serveur conserve l'architecture API JSON et front statique : la page
  HTML publique ne contient aucune donnée privée ; les droits sont vérifiés
  par l'API avant d'afficher le contenu admin.

## Contrôles

Exécuter `node tests/gof-b.mjs` avec `PHP_BIN` pointant vers PHP si nécessaire.
Le test utilise une base SQLite temporaire, sans toucher à la base configurée.
Il vérifie les accès API, les sessions indépendantes, les formulaires invalides,
le compte de test et les compteurs.

## Validation du 20 octobre 2026

Contrôles effectués avec le skill `verifier-us` :

| Contrôle | Résultat |
| --- | --- |
| Syntaxe des six fichiers PHP ajoutés/modifiés | VALIDÉ : `php -l` |
| Build du front | VALIDÉ : `npm run build` |
| API et création du compte de test | VALIDÉ : 38 contrôles sur SQLite isolée, en exécutant les contrôleurs et le script réels |
| Chrome 155.0.8059.85, Edge 155.0.4283.62, Firefox 156.0 | VALIDÉ : accès direct, refus client, connexion admin, navigation, rechargement et déconnexion |
| Mobile 360 px, tablette 768 px, desktop 1 200 px | VALIDÉ sur les trois navigateurs : aucun débordement horizontal |
| Sessions client et admin, panier | VALIDÉ : indépendance des déconnexions par API ; conservation client et panier dans Chrome et Edge |
| Panne de l'API des indicateurs | VALIDÉ dans Chrome et Edge : erreur explicite, aucun compteur inventé, récupération après rechargement |
| HTML réellement rendu | VALIDÉ par Nu 26.10.12 local : aucun diagnostic sur connexion, erreur de connexion, accueil, section future et panne des indicateurs |
| Styles GOF-B | VALIDÉ : classes Tailwind dans les templates, aucun sélecteur CSS admin personnalisé restant |
| CSS Tailwind compilé | VALIDÉ AVEC RÉSERVE OUTIL : 29 faux positifs Nu identifiés ci-dessous ; aucun autre diagnostic |
| Adresse localhost réellement utilisée | VALIDÉ : lien Administration, formulaire et champs visibles ; `/api/admin/me` répond 200 et `/api/admin/stats` refuse l'accès anonyme avec 401 |
| Compte admin existant | VALIDÉ PAR MAG : compte déjà présent et connexion réussie, confirmés dans cette conversation |
| Connexion SQL directe depuis Windows | NON NÉCESSAIRE : les identifiants IUT ne donnent pas accès au MySQL Windows ; l'application utilise l'API distante qui répond correctement |
| Tunnel de commande complet sur la base cible | NON REVÉRIFIÉ : hors périmètre GOF-B ; tests ciblés de l'authentification client et du panier exécutés sans régression |
| Branche, commits et fusion GitHub | À gérer par Mag ; aucune commande Git exécutée |

Les données « 2 produits / 3 commandes » des tests proviennent uniquement de la
base temporaire : aucun chiffre de démonstration n'est inséré dans l'application.
Le rendu a été comparé aux maquettes Figma P3-01 et P3-02. L'accueil reprend
uniquement les indicateurs de GOF-B ; les fonctions de PIL-A restent à réaliser.

Les tests de navigateurs ont été relancés après la conversion Tailwind, sur une
base temporaire isolée. La connexion réelle avec le compte existant est une
confirmation de Mag ; l'agent n'a ni récupéré son mot de passe ni utilisé sa session.

### Analyse des diagnostics CSS

Nu 26.10.12 signale toujours 29 erreurs brutes sur la feuille compilée. Elles ne
sont pas effacées des résultats de validation. Leur analyse les classe comme
faux positifs du validateur sur le CSS généré par Tailwind :

- 27 règles `@property` dites « non reconnues ». Cette règle est définie par
  [CSS Properties and Values API](https://www.w3.org/TR/css-properties-values-api-1/#at-property-rule).
  Les 27 propriétés sont aussi présentes dans les règles CSS reconnues par le
  navigateur de vérification.
- `margin-trim` apparaît dans une condition `@supports`, et non dans une
  déclaration appliquée aux éléments. Les tests de propriétés inconnues sont
  prévus par [CSS Conditional Rules](https://www.w3.org/TR/css-conditional-3/#at-supports).
- Les noms `--tw-gradient-*` de `transition-property` sont des identifiants
  personnalisés, autorisés par [CSS Transitions](https://www.w3.org/TR/css-transitions-1/#transition-property-property).

Après distinction de ces seuls messages, aucun diagnostic supplémentaire ne
reste. Il ne s'agit pas d'un résultat Nu brut sans erreur. Aucune dépendance ni
aucun style des autres US n'a été modifié pour contourner le validateur.

La validation a utilisé le validateur Nu officiel téléchargé depuis
<https://github.com/validator/validator/releases/download/latest/vnu.jar>, exécuté
localement. Aucun HTML ni CSS du projet n'a été envoyé à un service externe.

**Validation technique GOF-B effectuée**, avec les réserves de portée indiquées
dans le tableau et les faux positifs Nu documentés. La partie Git de la DoD
(branche, commits et fusion) reste exclusivement à effectuer par Mag ; l'agent
ne déclare pas cette partie terminée.
