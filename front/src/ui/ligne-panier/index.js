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
      quantite: ligne.quantite,
      sousTotal: formaterPrix(ligne.prix * ligne.quantite),
      image: import.meta.env.BASE_URL + "images/produits/" + ligne.image,
    });
  },

  dom: function (ligne, actions) {
    let fragment = htmlToFragment(LignePanierView.html(ligne));
    let moins = fragment.querySelector('[data-role="moins"]');
    let plus = fragment.querySelector('[data-role="plus"]');

    // Les bornes sont celles du panier : au moins 1 (« Supprimer » retire la ligne).
    moins.disabled = ligne.quantite <= 1;
    plus.disabled = ligne.quantite >= QUANTITE_MAX;

    moins.addEventListener("click", () => actions.surQuantite(ligne.slug, ligne.quantite - 1));
    plus.addEventListener("click", () => actions.surQuantite(ligne.slug, ligne.quantite + 1));
    fragment.querySelector('[data-role="supprimer"]').addEventListener("click", () => actions.surSupprimer(ligne.slug));
    return fragment;
  },
};

export { LignePanierView };
