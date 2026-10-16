import { ProductData } from "../../data/product.js";
import { htmlToFragment } from "../../lib/utils.js";
import { GrilleProduitsView } from "../../ui/grille-produits/index.js";
import { MessageView } from "../../ui/message/index.js";
import template from "./template.html?raw";

/**
 * Page « Catalogue » (DEC-B) : tous les produits de la boutique.
 */

let M = {
  produits: null, // liste reçue de l'API, ou null en cas d'erreur
  message: null, // { type, texte }, ou null
};

let C = {};

C.charger = async function () {
  try {
    M.produits = await ProductData.fetchAll();
    M.message = null;
  } catch (erreur) {
    M.produits = null;
    M.message = { type: "erreur", texte: `Impossible de charger le catalogue : ${erreur.message}` };
  }
};

C.init = async function () {
  await C.charger();
  return V.init();
};

let V = {};

V.init = function () {
  return V.createPageFragment();
};

V.createPageFragment = function () {
  let pageFragment = htmlToFragment(template);

  pageFragment.querySelector('slot[name="message"]').replaceWith(MessageView.dom(M.message));

  let slotGrille = pageFragment.querySelector('slot[name="grille"]');
  if (M.produits === null) {
    slotGrille.remove();
  } else {
    slotGrille.replaceWith(GrilleProduitsView.dom(M.produits));
  }

  return pageFragment;
};

export function CataloguePage() {
  return C.init();
}
