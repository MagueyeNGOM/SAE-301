import { htmlToFragment } from "../../lib/utils.js";
import template from "./template.html?raw";

// Onglets de l'espace personnel (maquette P2-06 et P2-09).
// actif : "apercu" ou "profil".
// shortcut: « Mes commandes » (SUI-C) n'a pas encore de page, son onglet viendra avec elle.
let OngletsCompteView = {
  dom: function (actif) {
    let fragment = htmlToFragment(template);
    fragment.querySelector(`[data-onglet="${actif}"]`).setAttribute("aria-current", "page");
    return fragment;
  },
};

export { OngletsCompteView };
