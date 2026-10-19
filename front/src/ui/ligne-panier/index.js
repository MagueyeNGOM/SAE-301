import { QUANTITE_MAX } from "../../data/cart.js";
import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import { formaterPrix } from "../../lib/format.js";
import template from "./template.html?raw";

// Une ligne du panier (CMD-B). Les actions de l'utilisateur sont signalées par
// actions.surQuantite(slug, quantite) et actions.surSupprimer(slug).
let LignePanierView = {
  html: function (ligne) {
    return genericRenderer(template, {
      nom: ligne.nom,
      slug: ligne.slug,
      prix: formaterPrix(ligne.prix),
      quantite: ligne.quantite,
      max: QUANTITE_MAX,
      sousTotal: formaterPrix(ligne.prix * ligne.quantite),
      image: import.meta.env.BASE_URL + "images/produits/" + ligne.image,
    });
  },

  dom: function (ligne, actions) {
    let fragment = htmlToFragment(LignePanierView.html(ligne));
    fragment
      .querySelector('[data-role="quantite"]')
      .addEventListener("change", (e) => actions.surQuantite(ligne.slug, e.target.valueAsNumber));
    fragment.querySelector('[data-role="supprimer"]').addEventListener("click", () => actions.surSupprimer(ligne.slug));
    return fragment;
  },
};

export { LignePanierView };
