import { htmlToFragment } from "../../lib/utils.js";
import template from "./template.html?raw";

// Pied de page de la maquette Figma. shortcut: texte fixe, sans liens, tant
// qu'aucune page « Contact » ou « Mentions légales » n'existe.
let PiedDePageView = {
  html: function () {
    return template;
  },

  dom: function () {
    return htmlToFragment(template);
  },
};

export { PiedDePageView };
