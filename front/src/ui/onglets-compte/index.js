import { htmlToFragment } from "../../lib/utils.js";
import template from "./template.html?raw";

// Onglets de l'espace personnel (maquettes P2-06, P2-07 et P2-09).
// actif : "apercu", "commandes" ou "profil".
let OngletsCompteView = {
  dom: function (actif) {
    let fragment = htmlToFragment(template);
    fragment.querySelector(`[data-onglet="${actif}"]`).setAttribute("aria-current", "page");
    return fragment;
  },
};

export { OngletsCompteView };
