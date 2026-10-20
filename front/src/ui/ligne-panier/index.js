import { CartData } from "../../data/cart.js";
import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import { formaterPrix } from "../../lib/format.js";
import template from "./template.html?raw";

// Une ligne du panier (CMD-B). Les actions de l'utilisateur sont signalées par
// actions.surQuantite(cle, quantite), actions.surModifier(cle) (OPT-A) et actions.surSupprimer(cle), la clé étant
// celle de CartData.cle (une taille ou un flocage différent fait une autre ligne).
let LignePanierView = {
  html: function (ligne) {
    return genericRenderer(template, {
      nom: ligne.nom,
      slug: ligne.slug,
      options: CartData.options(ligne),
      quantite: ligne.quantite,
      sousTotal: formaterPrix(CartData.prixUnitaire(ligne) * ligne.quantite),
      image: import.meta.env.BASE_URL + "images/produits/" + ligne.image,
    });
  },

  dom: function (ligne, actions) {
    let fragment = htmlToFragment(LignePanierView.html(ligne));
    let cle = CartData.cle(ligne);
    if (CartData.options(ligne) === "") {
      fragment.querySelector('[data-role="options"]').remove();
    }
    let moins = fragment.querySelector('[data-role="moins"]');
    let plus = fragment.querySelector('[data-role="plus"]');

    // Les bornes sont celles du panier : au moins 1 (« Supprimer » retire la ligne).
    moins.disabled = ligne.quantite <= 1;
    plus.disabled = ligne.quantite >= CartData.maximum(ligne);

    moins.addEventListener("click", () => actions.surQuantite(cle, ligne.quantite - 1));
    plus.addEventListener("click", () => actions.surQuantite(cle, ligne.quantite + 1));
    fragment.querySelector('[data-role="modifier"]').addEventListener("click", () => actions.surModifier(cle));
    fragment.querySelector('[data-role="supprimer"]').addEventListener("click", () => actions.surSupprimer(cle));
    return fragment;
  },
};

export { LignePanierView };
