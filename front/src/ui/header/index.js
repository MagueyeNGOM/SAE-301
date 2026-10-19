import { CartData } from "../../data/cart.js";
import { htmlToFragment } from "../../lib/utils.js";
import template from "./template.html?raw";

// HeaderView : en-tête de la boutique avec le menu des catégories (DEC-A) et
// le panier avec son compteur d'articles (CMD-B). shortcut: slugs écrits en
// dur comme en base, à charger depuis l'API si les catégories deviennent
// modifiables (GOF-C).
let HeaderView = {
  html: function () {
    return template;
  },

  dom: function () {
    let fragment = htmlToFragment(template);
    let compteur = fragment.querySelector('[data-role="compteur"]');
    let majCompteur = () => (compteur.textContent = CartData.compter());
    majCompteur();
    // Le compteur suit toute modification du panier, d'où qu'elle vienne.
    window.addEventListener("panier:change", majCompteur);
    return fragment;
  },
};

export { HeaderView };
