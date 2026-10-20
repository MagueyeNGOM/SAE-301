# GOF-C — Gestion des catégories

L'écran `/admin/categories` permet de créer et modifier une catégorie (nom et
description), puis de supprimer une catégorie vide après confirmation.
Il reprend la maquette Figma **P3-05 Catégories**, nœud `35:250`, avec les
composants, variables et classes Tailwind du projet. Sur mobile, le formulaire
passe sous la liste et les actions restent accessibles.

## Règles retenues

- Nom obligatoire, 60 caractères maximum ; description obligatoire lors de la
  saisie, 255 caractères maximum, sur une seule ligne. Validation client et serveur.
- Les noms déjà utilisés et les collisions de slug sont refusés avec un message
  en français. Les slugs des nouvelles catégories sont générés côté serveur.
- Renommer une catégorie ne change jamais son slug ni les produits associés.
- Une catégorie contenant des produits ne peut pas être supprimée. Le serveur
  le vérifie dans la requête de suppression ; la clé étrangère existante avec
  `ON DELETE RESTRICT` reste la protection en base, y compris en cas de concurrence.
- Aucun déplacement ni aucune suppression de produit n'est ajouté dans GOF-C.
- Les nouvelles routes utilisent la session et les protections administrateur
  de GOF-B. La connexion client et le panier restent indépendants.
- Le bouton « Accueil boutique » de l'en-tête revient à la racine du site sans
  déconnecter l'administrateur. L'en-tête reprend le bleu de l'accueil public et
  le titre Catégories est espacé du bouton d'ajout, à la demande de Mag.
- Le menu public lit les catégories depuis `GET /api/categories` à chaque
  navigation, au lieu de conserver trois liens écrits en dur.

## Mise en place sur une base existante

1. Sauvegarder la base avant son évolution.
2. Exécuter **une seule fois** `sql/migrations/gof-c-category-description.sql`
   dans la base cible, par exemple depuis phpMyAdmin. Cette migration ajoute
   uniquement la colonne `description` ; les données existantes sont conservées.
3. Déployer les fichiers PHP modifiés et le résultat de `npm run build` dans
   `front/dist/`, selon le fonctionnement actuel du projet.

**Ne pas réimporter `sql/import.sql` sur une base existante** : il supprime les
tables. Sa définition a seulement été mise à jour pour les installations neuves.
Les descriptions des anciennes catégories restent vides jusqu'à leur édition.
Le retour arrière SQL est documenté dans la migration et supprime les descriptions
si elles ont déjà été saisies ; leur sauvegarde est donc nécessaire avant ce retour.

Le front Vite utilise toujours le proxy vers l'API de l'IUT. Le développement
local ne déploie pas les nouvelles routes PHP sur ce serveur. La migration et
le déploiement distant n'ont pas été effectués pendant cette tâche.

## Vérification du 20 octobre 2026

Vérifications exécutées avec le skill `verifier-us` :

| Contrôle | Résultat |
| --- | --- |
| Syntaxe des quatre fichiers PHP ajoutés/modifiés | VALIDÉ : `php -l` |
| Syntaxe des modules JS ajoutés et du header | VALIDÉ : `node --check` |
| Build du front | VALIDÉ : `npm run build` ; dernier passage avec un avertissement de durée des plugins, sans erreur de compilation |
| Tests GOF-C | VALIDÉ : 47 contrôles API, sur SQLite temporaire isolée |
| Migration | VALIDÉ sur SQLite : exécution du fichier réel, conservation des catégories et produits ; NON VÉRIFIÉ sur la base MySQL cible |
| Régression GOF-B | VALIDÉ : 38 contrôles API/compte de test sur SQLite isolée |
| Chrome 155.0.8059.85, Edge 155.0.4283.62, Firefox 156.0 | VALIDÉ : parcours décrits ci-dessous |
| Responsive | VALIDÉ : aucun débordement horizontal à 360, 768 et 1 200 px dans les trois navigateurs |
| Comparaison Figma | VALIDÉ : contrôle visuel desktop et mobile ; titres, liste, formulaire et confirmation adaptés à P3-05 ; données issues des fixtures de test |
| HTML réellement rendu | VALIDÉ : Nu 26.10.12, sept états, aucun diagnostic ni avertissement |
| CSS Tailwind compilé | RÉSERVE OUTIL : 29 diagnostics, identiques à ceux documentés dans `docs/gof-b.md` : 27 `@property`, un `margin-trim` dans `@supports`, un `transition-property` ; aucun diagnostic supplémentaire |
| Déploiement et base distante | NON EFFECTUÉS : tous les scénarios de modification utilisent une base temporaire |
| GitHub, branche, commits et fusion | À gérer par Mag ; aucune commande Git exécutée |

Les parcours des trois navigateurs couvrent : accès direct sans session, refus
du compte client, connexion admin, création, refus d'un doublon avec conservation
de la saisie, modification, maintien des anciennes URLs, menu public dynamique,
fiche produit, annulation d'une suppression, suppression d'une catégorie vide,
blocage avec produits rattachés, affichage de texte HTML hostile sans exécution,
expiration de session admin, conservation de la session client et du panier.
Après les ajustements demandés par Mag, tous ces parcours ont été relancés sur
le build actuel. Le bouton « Accueil boutique », le retour vers l'administration
sans reconnexion, son affichage à 360/768/1 200 px, l'espacement titre/bouton et
l'égalité de couleur entre en-tête public et admin (`#0061AD`) sont aussi validés
dans Chrome, Edge et Firefox. Les sept états HTML ont été validés à nouveau par
Nu, sans diagnostic. Le CSS conserve exactement les mêmes 29 diagnostics GOF-B.
La panne de l'API catégories et le bouton Réessayer ont été testés dans Chrome
et Edge. Les contrôles API vérifient aussi la conservation des prix, images,
options et stocks après le renommage d'une catégorie.

Les sept états HTML validés sont : liste initiale, erreur de formulaire,
enregistrement réussi, suppression bloquée, texte échappé, panne API et session
expirée. Nu a été exécuté localement ; aucun document n'a été envoyé à un service.
Les captures et rapports sont conservés dans le dossier d'artefacts de cette tâche.

Pour relancer les tests automatisés depuis la racine :

```powershell
$env:PHP_BIN = 'C:/xampp/php/php.exe' # Adapter au PHP installé.
node tests/gof-c.mjs
node tests/gof-b.mjs
```

Le parcours complet de commande, la décrémentation automatique des stocks STK-A
et les autres sections admin n'ont pas été revalidés dans cette US. La validation
complète de la DoD reste conditionnée aux éléments distants et Git ci-dessus.
