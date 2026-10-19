import { ProductData } from "../../data/product.js";
import { formaterPrix } from "../../lib/format.js";
import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import { MessageView } from "../../ui/message/index.js";
import template from "./template.html?raw";
import templateCarte from "./carte.html?raw";

/**
 * Page « Accueil » : bandeau, produits disponibles et dernières pièces
 * (maquette Figma). La liste complète est sur /catalogue.
 */

const IMAGES = import.meta.env.BASE_URL + "images/produits/";

// Pastilles de la maquette. shortcut: l'API ne donne pas le stock, les pastilles
// sont fixées ici ; à remplacer par le vrai stock quand l'API l'expose.
const BADGES = {
  stock: { texte: "En stock", classes: "bg-om-succes-fond text-om-succes" },
  bientot: { texte: "Bientôt épuisé", classes: "bg-amber-100 text-amber-800" },
  epuise: { texte: "Épuisé", classes: "bg-om-fond-doux text-om-texte-doux" },
};

// Sélection de la maquette : fichier image du produit et pastille.
const DISPONIBLES = [
  ["maillot-domicile-26-27.png", "stock"],
  ["maillot-exterieur-26-27.png", "stock"],
  ["maillot-entrainement-26-27.png", "stock"],
  ["echarpe-droit-au-but.png", "stock"],
];
const DERNIERES = [
  ["maillot-third-26-27.png", "bientot"],
  ["veste-survetement-26-27.png", "bientot"],
  ["echarpe-om-navy.png", "bientot"],
  ["maillot-om-king.png", "epuise"],
];

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

// Cartes de la sélection ; un produit absent de l'API est simplement ignoré.
V.cartes = function (selection) {
  let cartes = [];
  for (let [image, badge] of selection) {
    let produit = M.produits.find((p) => p.image === image);
    if (!produit) continue;
    cartes.push(
      htmlToFragment(
        genericRenderer(templateCarte, {
          slug: produit.slug,
          nom: produit.nom,
          prix: formaterPrix(produit.prix),
          image: IMAGES + produit.image,
          badge: BADGES[badge].texte,
          badgeClasses: BADGES[badge].classes,
        }),
      ),
    );
  }
  return cartes;
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
    slotDisponibles.replaceWith(...V.cartes(DISPONIBLES));
    slotDernieres.replaceWith(...V.cartes(DERNIERES));
  }

  return pageFragment;
};

export function AccueilPage() {
  return C.init();
}
