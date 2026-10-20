# GOF-A — Gestion des produits

La section `/admin/produits` remplace l’écran d’attente. Elle permet de créer,
modifier et supprimer les produits, avec confirmation avant suppression.
Le formulaire gère le nom, la description, les détails, la catégorie, le prix,
le badge nouveauté, le seuil d’alerte, les tailles proposées, leur stock,
le flocage et son prix, ainsi que la galerie et l’image principale.

Les écrans reprennent les maquettes Figma
[P3-03 Liste des produits](https://www.figma.com/design/O7MtemKsP8zw6wSXpBU5Hb/Untitled?node-id=35-86)
et [P3-04 Formulaire produit](https://www.figma.com/design/O7MtemKsP8zw6wSXpBU5Hb/Untitled?node-id=35-164),
leurs variables et les composants existants. L’en-tête bleu et le lien « Accueil
boutique » ajoutés dans GOF-C sont conservés. Le formulaire passe sur une colonne
sur mobile ; le tableau possède son propre défilement horizontal.

## Règles retenues

- Le slug est généré à la création et reste stable lors des modifications.
  Les collisions sont refusées avec une erreur en français.
- Le nom est obligatoire (120 caractères maximum) ; la description est
  obligatoire et les détails facultatifs (20 000 caractères maximum chacun).
- Les prix sont positifs ou nuls, avec deux décimales maximum : 99 999,99 €
  pour le produit et 999,99 € pour le flocage.
- Au moins une variante doit être proposée. Chaque stock et le seuil sont des
  entiers de 0 à 65 535. « Unique » ne peut pas être combinée avec d’autres tailles.
- Le stock affiché est la somme des variantes proposées. Le seuil s’applique à
  cette somme dans le catalogue et la fiche produit. La valeur NULL en base
  conserve le seuil global `seuil_stock` du projet (actuellement 5).
- Les prix et options déjà enregistrés dans les commandes restent inchangés.
  La suppression d’un produit déjà commandé est bloquée par l’API et la clé
  étrangère existante. Les variantes et la galerie d’un produit supprimable
  sont supprimées en cascade.
- Produit, variantes et galerie sont enregistrés dans une même transaction.
  Un échec annule toutes les écritures et enlève les nouveaux fichiers créés.
- Les contrôles administrateur et les sessions séparées de GOF-B sont réutilisés.
  La validation existe côté client et serveur ; les données affichées sont échappées.

## Images

La sélection des fichiers reste locale jusqu’à l’enregistrement du produit.
La première image devient l’image principale. Les commandes « Avancer »,
« Reculer » et « Retirer » permettent de gérer la galerie.

- De 1 à 8 images, JPEG, PNG ou WebP ; 2 Mo par fichier et 4 Mo de nouveaux
  fichiers par enregistrement. La requête admin est limitée à 6 Mo.
- Le serveur vérifie le contenu réel, limite les dimensions à 6 000 pixels par
  côté et 12 millions de pixels, puis réencode en JPEG sur fond blanc, sans
  métadonnées, avec un côté maximal de 1 600 pixels. Les SVG sont refusés.
- Les noms de fichiers sont générés par le serveur. Une modification ne peut
  référencer que les images déjà rattachées au produit ou de nouveaux fichiers
  contrôlés. Les chemins fournis arbitrairement sont refusés.
- Les fichiers sont stockés dans `back/storage/product-images/`, hors de
  `front/dist/`. La règle `.htaccess` expose uniquement les JPEG générés sous
  `images/produits/om-<identifiant>.jpg`. Vite relaie ces nouvelles images vers
  le même serveur que l’API ; les images initiales gardent leurs URL.
- Retirer une image ou supprimer un produit enlève son association en base.
  Les fichiers déjà enregistrés restent sur disque pour préserver les références
  des paniers et éviter une suppression pendant une édition concurrente.
  Un éventuel nettoyage de ces fichiers inutilisés doit donc être prévu si le
  volume d’images devient important. Aucun nettoyage des images initiales n’est effectué.

## Mise en place sur une base existante

1. Sauvegarder la base et les images existantes.
2. Vérifier que GOF-B et GOF-C sont déployées et que la migration des descriptions
   de catégories a déjà été appliquée. Le README décrit encore le starter films ;
   les dépendances GOF-A proviennent de `docs/user-stories.md`.
3. Exécuter une seule fois `sql/migrations/gof-a-product-stock-threshold.sql`
   dans la base cible. Cette migration ajoute uniquement une colonne nullable.
   Ne pas réimporter `sql/import.sql` : ce fichier supprime les tables et sert
   seulement aux installations neuves.
4. Activer PHP GD sur le serveur, avec les décodeurs JPEG, PNG et WebP souhaités.
   Sans GD, les modifications conservant les images existantes fonctionnent ;
   le téléversement affiche une erreur explicite. Prévoir une limite de corps de
   requête du serveur d’au moins 6 Mo.
5. Donner au processus PHP le droit d’écrire dans `back/storage/product-images/`.
   Conserver ce dossier et son contenu à chaque déploiement et dans les sauvegardes.
6. Déployer le back, `.htaccess` et le résultat de `npm run build` dans `front/dist/`.
   Le développement local Vite utilise l’API distante : il ne déploie ni le PHP
   ni la migration. Vérifier ensuite un téléversement sur le serveur cible.

Le retour arrière SQL est indiqué dans la migration. Sauvegarder les seuils
personnalisés avant de supprimer la colonne et remettre une version compatible
du code si un retour arrière est nécessaire.

## Vérification du 20 octobre 2026

Contrôles effectués avec le skill `verifier-us`, sans modifier la base distante :

| Contrôle | Résultat |
| --- | --- |
| Syntaxe PHP | VALIDÉ : les six fichiers PHP ajoutés ou modifiés passent `php -l` |
| Syntaxe JavaScript | VALIDÉ : modules modifiés, configuration Vite et tests passent `node --check` |
| Build front | VALIDÉ : `npm run build`, sans avertissement au dernier passage |
| GOF-A | VALIDÉ : 75 contrôles API sur SQLite temporaire, avec les contrôleurs et modèles réels |
| Migration | VALIDÉ sur SQLite : conservation des produits et seuil global par défaut ; MySQL distant NON VÉRIFIÉ |
| Images | VALIDÉ : PNG 2 400 × 1 200 transformé en JPEG 1 600 × 800, refus des fichiers invalides/SVG/chemins arbitraires, réordonnancement et retrait |
| Transactions | VALIDÉ : panne simulée à l’insertion de la galerie, restauration du produit, des stocks et de la galerie ; nettoyage des nouvelles images après échec SQL |
| Commandes et options | VALIDÉ : commande réelle sur la fixture avec taille et flocage, refus du stock insuffisant/épuisé, prix historique conservé après modification d’un produit commandé |
| Régression GOF-C / GOF-B | VALIDÉ : respectivement 47 et 38 contrôles API sur SQLite isolée |
| Chrome 155.0.8059.85 | VALIDÉ : parcours GOF-A et responsive |
| Edge 155.0.4283.62 | VALIDÉ : parcours GOF-A et responsive |
| Firefox 156.0 | VALIDÉ : parcours GOF-A et responsive |
| Responsive | VALIDÉ : aucun débordement du document à 360, 768 et 1 200 px, liste et formulaire dans les trois navigateurs |
| Figma | VALIDÉ : comparaison visuelle desktop et mobile avec P3-03/P3-04 ; données et images des fixtures |
| HTML rendu | VALIDÉ : Nu 26.10.12, sept états, aucun diagnostic |
| CSS compilé | RÉSERVE OUTIL : 29 diagnostics, mêmes catégories que GOF-B/GOF-C ; 27 `@property`, un `margin-trim` dans `@supports`, un `transition-property` généré par Tailwind ; aucun diagnostic supplémentaire |
| Routage des images | VALIDÉ : `.htaccess` réel sous Apache temporaire ; JPEG persistants, images initiales, stockage non exposé directement et route SPA `/admin/produits` |
| Déploiement, GD et droits du serveur distant | NON EFFECTUÉS / NON VÉRIFIÉS |
| GitHub, branche, commits et fusion | À gérer par Mag ; aucune commande Git exécutée |

Les parcours des trois navigateurs couvrent l’accès direct sans session, le refus
du compte client, la connexion admin, un formulaire invalide, la création avec
image, l’édition des variantes, des stocks et du flocage, la suppression annulée,
confirmée et bloquée par une commande, puis la déconnexion. Chrome et Edge couvrent
aussi le réordonnancement/retrait des images, la panne et la récupération de l’API,
l’expiration de session et la conservation du panier et de la session client.

Les sept états HTML sont : liste, formulaire rempli, erreur de formulaire,
création réussie, confirmation de suppression, suppression bloquée et panne API.
Les captures, documents rendus et rapports sont conservés dans le dossier local
des artefacts de cette tâche (`01a159e8-11e4-7e00-9d8d-90984f31a902`).

Pour relancer les tests depuis la racine, avec un PHP disposant de PDO SQLite et GD :

```powershell
$env:PHP_BIN = 'C:/xampp/php/php.exe' # Adapter au PHP installé.
node tests/gof-a.mjs
node tests/gof-c.mjs
node tests/gof-b.mjs
```

Les tests GOF-A activent GD pour leur processus si l’extension n’est pas déjà
chargée ; ils ne modifient pas le `php.ini` installé. Les fichiers créés pour les
tests et les bases temporaires sont nettoyés à la fin des scénarios.

STK-A reste à réaliser : aucune décrémentation ou restauration automatique du
stock n’est ajoutée ici. La validation complète de la DoD reste conditionnée au
déploiement, aux vérifications sur le serveur cible et aux opérations Git de Mag.
