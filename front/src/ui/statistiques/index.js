import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import { formaterPrix } from "../../lib/format.js";
import template from "./template.html?raw";
import templateLigne from "./ligne-categorie.html?raw";

// Tableau de bord de la zone d'administration.
// Un template par élément répété : la ligne de catégorie a le sien, et chaque
// ligne prend place dans le <slot name="categories">.
let StatistiquesView = {
  /**
   * @param {{total: number, prixMoyen: number,
   *          parCategorie: Array<{categorie: string, nombre: number}>}} stats
   */
  dom: function (stats) {
    let fragment = htmlToFragment(
      genericRenderer(template, {
        total: stats.total,
        prixMoyen: formaterPrix(stats.prixMoyen),
      })
    );

    let lignes = stats.parCategorie.map((ligne) => htmlToFragment(genericRenderer(templateLigne, ligne)));
    fragment.querySelector('slot[name="categories"]').replaceWith(...lignes);

    return fragment;
  },
};

export { StatistiquesView };
