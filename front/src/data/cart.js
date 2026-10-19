/**
 * Panier (CMD-B, OPT-C) : stocké dans le navigateur (localStorage), sans appel à l'API.
 * Une ligne : { slug, nom, prix, image, quantite, taille, flocage, prixFlocage }
 * avec taille { id, libelle } ou null, et flocage { nom, numero } ou null.
 * Une ligne est identifiée par sa clé (CartData.cle) : deux tailles, ou deux
 * flocages, d'un même produit font deux lignes.
 * Après chaque modification, l'événement « panier:change » est émis : le
 * compteur de l'en-tête s'y abonne.
 */
const CLE = "panier";
const QUANTITE_MAX = 99;

let CartData = {};

CartData.lire = function () {
  try {
    let lignes = JSON.parse(localStorage.getItem(CLE));
    return Array.isArray(lignes) ? lignes : [];
  } catch {
    // Stockage indisponible ou contenu illisible : on repart d'un panier vide.
    return [];
  }
};

CartData.enregistrer = function (lignes) {
  try {
    localStorage.setItem(CLE, JSON.stringify(lignes));
  } catch {
    // Stockage plein ou refusé : le panier reste vide plutôt que de planter.
  }
  window.dispatchEvent(new CustomEvent("panier:change"));
};

// Identifiant d'une ligne. Les lignes enregistrées avant OPT-C n'ont ni taille
// ni flocage : leur clé finit par « || » et elles restent utilisables.
CartData.cle = function (ligne) {
  return [ligne.slug, ligne.taille?.id ?? "", ligne.flocage?.nom ?? "", ligne.flocage?.numero ?? ""].join("|");
};

// Prix d'une pièce : prix du produit, plus le flocage s'il est choisi.
CartData.prixUnitaire = function (ligne) {
  return ligne.prix + (ligne.flocage ? (ligne.prixFlocage ?? 0) : 0);
};

// Texte des options choisies (« Taille L · Flocage NGOM 10 »), "" s'il n'y en a pas.
CartData.options = function (ligne) {
  let options = [];
  if (ligne.taille) {
    options.push(`Taille ${ligne.taille.libelle}`);
  }
  if (ligne.flocage) {
    options.push(`Flocage ${ligne.flocage.nom} ${ligne.flocage.numero}`);
  }
  return options.join(" · ");
};

// options : { taille, flocage }, comme dans une ligne du panier.
CartData.ajouter = function (produit, options = {}) {
  let nouvelle = {
    slug: produit.slug,
    nom: produit.nom,
    prix: Number(produit.prix),
    image: produit.image,
    quantite: 1,
    taille: options.taille ?? null,
    flocage: options.flocage ?? null,
    prixFlocage: Number(produit.prixFlocage ?? 0),
  };
  let lignes = CartData.lire();
  let ligne = lignes.find((l) => CartData.cle(l) === CartData.cle(nouvelle));
  if (ligne) {
    ligne.quantite = Math.min(ligne.quantite + 1, QUANTITE_MAX);
  } else {
    lignes.push(nouvelle);
  }
  CartData.enregistrer(lignes);
};

// Une quantité inférieure à 1 supprime la ligne.
CartData.changerQuantite = function (cle, quantite) {
  if (!(quantite >= 1)) {
    return CartData.supprimer(cle);
  }
  let lignes = CartData.lire();
  let ligne = lignes.find((l) => CartData.cle(l) === cle);
  if (ligne) {
    ligne.quantite = Math.min(Math.floor(quantite), QUANTITE_MAX);
    CartData.enregistrer(lignes);
  }
};

CartData.supprimer = function (cle) {
  CartData.enregistrer(CartData.lire().filter((l) => CartData.cle(l) !== cle));
};

// Nombre d'articles (somme des quantités).
CartData.compter = function () {
  return CartData.lire().reduce((somme, l) => somme + l.quantite, 0);
};

CartData.total = function () {
  return CartData.lire().reduce((somme, l) => somme + CartData.prixUnitaire(l) * l.quantite, 0);
};

export { CartData, QUANTITE_MAX };
