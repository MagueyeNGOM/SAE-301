import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import template from "./template.html?raw";

// Champ de formulaire de la maquette Figma. Les erreurs ne sont pas affichées
// par champ : la maquette les regroupe dans un seul bandeau (formulaire-auth).
// data : { id, libelle, type, autocomplete, placeholder, valeur }.
let ChampFormulaireView = {
  html: function (data) {
    return genericRenderer(template, {
      id: data.id,
      libelle: data.libelle,
      type: data.type ?? "text",
      autocomplete: data.autocomplete ?? "off",
      placeholder: data.placeholder ?? "",
      valeur: data.valeur ?? "",
    });
  },

  dom: function (data) {
    return htmlToFragment(ChampFormulaireView.html(data));
  },
};

export { ChampFormulaireView };
