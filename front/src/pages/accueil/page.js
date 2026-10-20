import { ProductData } from "../../data/product.js";
import { formaterPrix } from "../../lib/format.js";
import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import { MessageView } from "../../ui/message/index.js";
import { PastilleStockView } from "../../ui/pastille-stock/index.js";
import template from "./template.html?raw";
import templateCarte from "./carte.html?raw";

/**
 * Page « Accueil » : bandeau, produits disponibles et dernières pièces
 * (maquette Figma). La liste complète est sur /catalogue.
 */

const IMAGES = import.meta.env.BASE_URL + "images/produits/";

// Nombre de produits par section de la maquette.
const NB_PAR_SECTION = 4;

let M = {
  produits: null, // liste reçue de l'API, ou null en cas d'erreur
  message: null, // { type, texte }, ou null
};

let C = {};

C.init = async function () {
  try {
    M.produits = await ProductData.fetchAll();
    M.message = null;
  } catch (erreur) {
    M.produits = null;
    M.message = { type: "erreur", texte: `Impossible de charger les produits : ${erreur.message}` };
  }
  return V.init();
};

let V = {};

V.init = function () {
  return V.createPageFragment();
};

// Une carte par produit, avec la pastille de son stock réel (STK-B).
V.cartes = function (produits) {
  return produits.map((produit) => {
    let carte = htmlToFragment(
      genericRenderer(templateCarte, {
        slug: produit.slug,
        nom: produit.nom,
        prix: formaterPrix(produit.prix),
        image: IMAGES + produit.image,
      }),
    );
    carte.querySelector('slot[name="stock"]').replaceWith(PastilleStockView.dom(produit.stock));
    return carte;
  });
};

V.createPageFragment = function () {
  let pageFragment = htmlToFragment(
    genericRenderer(template, {
      hero: IMAGES + "bandeau-accueil.png",
      maillot: IMAGES + "maillot-domicile-26-27.png",
    }),
  );

  pageFragment.querySelector('slot[name="message"]').replaceWith(MessageView.dom(M.message));

  let slotDisponibles = pageFragment.querySelector('slot[name="disponibles"]');
  let slotDernieres = pageFragment.querySelector('slot[name="dernieres"]');
  if (M.produits === null) {
    slotDisponibles.remove();
    slotDernieres.remove();
  } else {
    // « Disponible maintenant » : produits en stock ; « Dernières pièces » : les autres.
    slotDisponibles.replaceWith(...V.cartes(M.produits.filter((p) => p.stock === "en_stock").slice(0, NB_PAR_SECTION)));
    slotDernieres.replaceWith(...V.cartes(M.produits.filter((p) => p.stock !== "en_stock").slice(0, NB_PAR_SECTION)));

    let hero = M.produits.find((p) => p.slug === "maillot-domicile-26-27");
    let slotHero = pageFragment.querySelector('slot[name="stock-hero"]');
    if (hero) {
      slotHero.replaceWith(PastilleStockView.dom(hero.stock));
    } else {
      slotHero.remove();
    }
  }

  return pageFragment;
};

export function AccueilPage() {
  return C.init();
}
