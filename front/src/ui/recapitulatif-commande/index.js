import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import template from "./template.html?raw";

// Bloc « Récapitulatif » du panier et de la commande (CMD-A). Le slot
// « action » reçoit le bouton propre à chaque page ; la page le remplace, ou le
// retire s'il n'y en a pas. data : { sousTotal, total }, déjà formatés.
let RecapitulatifCommandeView = {
  html: function (data) {
    return genericRenderer(template, { sousTotal: data.sousTotal, total: data.total });
  },

  dom: function (data) {
    return htmlToFragment(RecapitulatifCommandeView.html(data));
  },
};

export { RecapitulatifCommandeView };
