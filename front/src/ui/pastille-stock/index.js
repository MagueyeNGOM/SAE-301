import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import template from "./template.html?raw";

// Les classes sont écrites en entier, et non assemblées : Tailwind ne génère
// que les classes qu'il trouve telles quelles dans le code.
const ETATS = {
  en_stock: { texte: "En stock", classes: "bg-om-succes-fond text-om-succes" },
  bientot: { texte: "Bientôt épuisé", classes: "bg-om-attention-fond text-om-attention" },
  epuise: { texte: "Épuisé", classes: "bg-om-fond-doux text-om-texte-doux" },
};

// Pastille d'état du stock (STK-B). etat vient de l'API : "en_stock", "bientot" ou "epuise".
let PastilleStockView = {
  html: function (etat) {
    return genericRenderer(template, ETATS[etat]);
  },

  dom: function (etat) {
    return htmlToFragment(PastilleStockView.html(etat));
  },
};

export { PastilleStockView };
