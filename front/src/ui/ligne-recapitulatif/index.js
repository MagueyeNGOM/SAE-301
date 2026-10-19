import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import { formaterPrix } from "../../lib/format.js";
import template from "./template.html?raw";

// Une ligne de la page « Vérifiez votre commande » (CMD-A) : lecture seule,
// sans action. ligne : { slug, nom, prix, image, quantite } comme le panier.
let LigneRecapitulatifView = {
  html: function (ligne) {
    return genericRenderer(template, {
      nom: ligne.nom,
      quantite: ligne.quantite,
      sousTotal: formaterPrix(ligne.prix * ligne.quantite),
      image: import.meta.env.BASE_URL + "images/produits/" + ligne.image,
    });
  },

  dom: function (ligne) {
    return htmlToFragment(LigneRecapitulatifView.html(ligne));
  },
};

export { LigneRecapitulatifView };
