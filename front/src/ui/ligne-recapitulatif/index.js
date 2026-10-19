import { CartData } from "../../data/cart.js";
import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import { formaterPrix } from "../../lib/format.js";
import template from "./template.html?raw";

// Une ligne de la page « Vérifiez votre commande » (CMD-A) : lecture seule,
// sans action. ligne : { slug, nom, prix, image, quantite, taille, flocage, prixFlocage } comme le panier.
let LigneRecapitulatifView = {
  html: function (ligne) {
    return genericRenderer(template, {
      nom: ligne.nom,
      options: CartData.options(ligne),
      quantite: ligne.quantite,
      sousTotal: formaterPrix(CartData.prixUnitaire(ligne) * ligne.quantite),
      image: import.meta.env.BASE_URL + "images/produits/" + ligne.image,
    });
  },

  dom: function (ligne) {
    let fragment = htmlToFragment(LigneRecapitulatifView.html(ligne));
    if (CartData.options(ligne) === "") {
      fragment.querySelector('[data-role="options"]').remove();
    }
    return fragment;
  },
};

export { LigneRecapitulatifView };
