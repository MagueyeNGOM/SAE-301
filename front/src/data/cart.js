/**
 * Panier (CMD-B, OPT-C) : stocké dans le navigateur (localStorage), sans appel à l'API.
 * Une ligne : { slug, nom, prix, image, quantite, taille, flocage, prixFlocage, stock }
 * avec taille { id, libelle } ou null, flocage { nom, numero } ou null, et
 * stock (STK-C) : le stock de la taille à la dernière vérification, ou null.
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

// Quantité maximale d'une ligne : le stock de sa taille (STK-C), sinon la limite du panier.
CartData.maximum = function (ligne) {
  return Math.min(QUANTITE_MAX, ligne.stock ?? QUANTITE_MAX);
};

// Ajuste les lignes au stock réel (STK-C). produits : { slug: produit de l'API }.
// Retire les tailles épuisées, ramène les quantités au stock, et renvoie les
// messages à afficher. Les lignes d'un produit absent de produits sont laissées
// telles quelles : le serveur reste juge à la validation.
// shortcut: le bouton « + » d'une ligne ne tient pas compte des autres lignes de la même taille, le serveur refuse alors la commande.
CartData.ajusterStocks = function (produits) {
  let messages = [];
  let restant = {}; // stock restant par produit et taille, partagé entre les lignes
  let lignes = CartData.lire().filter((ligne) => {
    let taille = produits[ligne.slug]?.tailles.find((t) => t.id === ligne.taille?.id);
    if (!taille) {
      return true;
    }
    let reserve = ligne.slug + "|" + taille.id;
    restant[reserve] ??= taille.quantite;
    ligne.stock = taille.quantite;
    let quantite = Math.min(ligne.quantite, restant[reserve]);
    if (quantite < 1) {
      messages.push(`« ${ligne.nom} » (taille ${taille.libelle}) est épuisé : il a été retiré de votre panier.`);
      return false;
    }
    if (quantite < ligne.quantite) {
      messages.push(`Il ne reste que ${taille.quantite} exemplaire${taille.quantite > 1 ? "s" : ""} de « ${ligne.nom} » (taille ${taille.libelle}) : la quantité a été ajustée.`);
      ligne.quantite = quantite;
    }
    restant[reserve] -= quantite;
    return true;
  });
  CartData.enregistrer(lignes);
  return messages;
};

// options : { taille, flocage }, comme dans une ligne du panier.
// Renvoie "" si le produit est ajouté, sinon le message d'erreur (stock atteint).
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
    stock: options.taille?.stock ?? null,
  };
  let lignes = CartData.lire();
  let ligne = lignes.find((l) => CartData.cle(l) === CartData.cle(nouvelle));
  if (ligne) {
    ligne.stock = nouvelle.stock;
    if (ligne.quantite >= CartData.maximum(ligne)) {
      return ligne.stock !== null && ligne.quantite >= ligne.stock
        ? `Stock atteint : vous avez déjà ${ligne.quantite} exemplaire${ligne.quantite > 1 ? "s" : ""} de cet article, il n'en reste pas davantage.`
        : `Vous ne pouvez pas commander plus de ${QUANTITE_MAX} exemplaires d'un article.`;
    }
    ligne.quantite += 1;
  } else {
    lignes.push(nouvelle);
  }
  CartData.enregistrer(lignes);
  return "";
};

// Remplace la taille et le flocage d'une ligne (OPT-A). options : { taille, flocage }.
// Si une autre ligne a alors les mêmes options, les deux fusionnent.
CartData.modifierOptions = function (cle, options) {
  let lignes = CartData.lire();
  let ligne = lignes.find((l) => CartData.cle(l) === cle);
  if (!ligne) {
    return;
  }
  ligne.taille = options.taille ?? null;
  ligne.stock = options.taille?.stock ?? null;
  ligne.flocage = options.flocage ?? null;
  let autre = lignes.find((l) => l !== ligne && CartData.cle(l) === CartData.cle(ligne));
  if (autre) {
    autre.quantite = Math.min(autre.quantite + ligne.quantite, QUANTITE_MAX);
    lignes.splice(lignes.indexOf(ligne), 1);
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
    ligne.quantite = Math.min(Math.floor(quantite), CartData.maximum(ligne));
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
