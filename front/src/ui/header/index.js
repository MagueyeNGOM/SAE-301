import { htmlToFragment } from "../../lib/utils.js";
import template from "./template.html?raw";

// HeaderView est un composant sans données : en-tête de la boutique avec le
// menu des catégories (DEC-A). shortcut: slugs écrits en dur comme en base, à
// charger depuis l'API si les catégories deviennent modifiables (GOF-C).
let HeaderView = {
  html: function () {
    return template;
  },

  dom: function () {
    return htmlToFragment(template);
  },
};

export { HeaderView };
