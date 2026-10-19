import { CartData } from "../../data/cart.js";
import { ProductData } from "../../data/product.js";
import { htmlToFragment } from "../../lib/utils.js";
import { FicheProduitView } from "../../ui/fiche-produit/index.js";
import { MessageView } from "../../ui/message/index.js";
import template from "./template.html?raw";

/**
 * Page « Fiche produit » (DEC-C) : /produit/:slug.
 */

let M = {
  produit: null, // produit reçu de l'API, ou null en cas d'erreur
  message: null, // { type, texte }, ou null
};

let C = {};

C.charger = async function (slug) {
  try {
    M.produit = await ProductData.fetchOne(slug);
    M.message = null;
  } catch (erreur) {
    M.produit = null;
    M.message = { type: "erreur", texte: erreur.message };
  }
};

C.handler_ajouter = function (produit) {
  CartData.ajouter(produit);
};

C.init = async function (params) {
  await C.charger(params.slug);
  return V.init();
};

let V = {};

V.init = function () {
  return V.createPageFragment();
};

// SEO : titre et description de la page selon le produit.
V.metadonnees = function () {
  document.title = M.produit ? `${M.produit.nom} | Boutique OM` : "Produit introuvable | Boutique OM";

  let meta = document.querySelector('meta[name="description"]');
  if (meta === null) {
    meta = document.createElement("meta");
    meta.name = "description";
    document.head.append(meta);
  }
  meta.content = M.produit ? M.produit.description : "";
};

V.createPageFragment = function () {
  V.metadonnees();
  let pageFragment = htmlToFragment(template);

  pageFragment.querySelector('slot[name="message"]').replaceWith(MessageView.dom(M.message));

  let slotFiche = pageFragment.querySelector('slot[name="fiche"]');
  if (M.produit === null) {
    slotFiche.remove();
  } else {
    slotFiche.replaceWith(FicheProduitView.dom(M.produit, { surAjouter: C.handler_ajouter }));
  }

  return pageFragment;
};

export function ProduitPage(params) {
  return C.init(params);
}
