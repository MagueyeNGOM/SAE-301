import { htmlToFragment } from "../../lib/utils.js";
import { CarteProduitView } from "../carte-produit/index.js";
import template from "./template.html?raw";
import templateVide from "./vide.html?raw";

// Grille de cartes produits.
let GrilleProduitsView = {
  dom: function (produits) {
    if (produits.length === 0) {
      return htmlToFragment(templateVide);
    }

    let fragment = htmlToFragment(template);
    let cartes = produits.map((produit) => CarteProduitView.dom(produit));
    fragment.querySelector('slot[name="cartes"]').replaceWith(...cartes);
    return fragment;
  },
};

export { GrilleProduitsView };
