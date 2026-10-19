import { ProductData } from "../../data/product.js";
import { htmlToFragment } from "../../lib/utils.js";
import { GrilleProduitsView } from "../../ui/grille-produits/index.js";
import { MessageView } from "../../ui/message/index.js";
import template from "./template.html?raw";

/**
 * Page « Catalogue » (DEC-B) : les produits de la boutique, filtrés par
 * catégorie si l'adresse est /categorie/:slug (DEC-A).
 */

let M = {
  slug: null, // catégorie de l'adresse, ou null pour tous les produits
  categories: [], // [{ nom, slug, nombre }], pour le titre de la catégorie
  produits: null, // liste reçue de l'API, ou null en cas d'erreur
  message: null, // { type, texte }, ou null
};

let C = {};

C.charger = async function (slug) {
  M.slug = slug ?? null;
  try {
    [M.categories, M.produits] = await Promise.all([ProductData.fetchCategories(), ProductData.fetchAll(M.slug)]);
    M.message = null;
  } catch (erreur) {
    M.produits = null;
    M.message = { type: "erreur", texte: `Impossible de charger le catalogue : ${erreur.message}` };
  }
};

C.init = async function (params) {
  await C.charger(params.slug);
  return V.init();
};

let V = {};

V.init = function () {
  return V.createPageFragment();
};

// Nom de la catégorie affichée, ou « Tous les produits ».
V.titre = function () {
  let categorie = M.categories.find((c) => c.slug === M.slug);
  return categorie ? categorie.nom : "Tous les produits";
};

V.createPageFragment = function () {
  let pageFragment = htmlToFragment(template);

  pageFragment.querySelector('slot[name="ariane"]').replaceWith(V.titre());
  pageFragment.querySelector('slot[name="titre"]').replaceWith(V.titre());
  let compteur = M.produits === null ? "" : `${M.produits.length} produit${M.produits.length > 1 ? "s" : ""}`;
  pageFragment.querySelector('slot[name="compteur"]').replaceWith(compteur);

  pageFragment.querySelector('slot[name="message"]').replaceWith(MessageView.dom(M.message));

  let slotGrille = pageFragment.querySelector('slot[name="grille"]');
  if (M.produits === null) {
    slotGrille.remove();
  } else {
    slotGrille.replaceWith(GrilleProduitsView.dom(M.produits));
  }

  return pageFragment;
};

export function CataloguePage(params) {
  return C.init(params);
}
