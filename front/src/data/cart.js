/**
 * Panier (CMD-B) : stocké dans le navigateur (localStorage), sans appel à l'API.
 * Une ligne : { slug, nom, prix, image, quantite }.
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

CartData.ajouter = function (produit) {
  let lignes = CartData.lire();
  let ligne = lignes.find((l) => l.slug === produit.slug);
  if (ligne) {
    ligne.quantite = Math.min(ligne.quantite + 1, QUANTITE_MAX);
  } else {
    lignes.push({ slug: produit.slug, nom: produit.nom, prix: Number(produit.prix), image: produit.image, quantite: 1 });
  }
  CartData.enregistrer(lignes);
};

// Une quantité inférieure à 1 supprime la ligne.
CartData.changerQuantite = function (slug, quantite) {
  if (!(quantite >= 1)) {
    return CartData.supprimer(slug);
  }
  let lignes = CartData.lire();
  let ligne = lignes.find((l) => l.slug === slug);
  if (ligne) {
    ligne.quantite = Math.min(Math.floor(quantite), QUANTITE_MAX);
    CartData.enregistrer(lignes);
  }
};

CartData.supprimer = function (slug) {
  CartData.enregistrer(CartData.lire().filter((l) => l.slug !== slug));
};

// Nombre d'articles (somme des quantités).
CartData.compter = function () {
  return CartData.lire().reduce((somme, l) => somme + l.quantite, 0);
};

CartData.total = function () {
  return CartData.lire().reduce((somme, l) => somme + l.prix * l.quantite, 0);
};

export { CartData, QUANTITE_MAX };
