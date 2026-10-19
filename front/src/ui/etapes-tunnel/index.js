import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import template from "./template.html?raw";
import etapeTemplate from "./etape.html?raw";
import traitTemplate from "./trait.html?raw";

const LIBELLES = ["Panier", "Connexion", "Récapitulatif", "Confirmation"];

// Étapes de la commande (maquette Figma « Étape du tunnel de commande »).
// data : { etape: 1 à 4 }, l'étape en cours. Les étapes d'avant sont faites,
// celles d'après à venir. Sur mobile, seule l'étape en cours garde son libellé.
let EtapesTunnelView = {
  html: function () {
    return template;
  },

  dom: function (data) {
    let fragment = htmlToFragment(template);
    let liste = fragment.querySelector("ol");

    LIBELLES.forEach((libelle, i) => {
      let numero = i + 1;

      // Le trait qui précède une étape est bleu si cette étape est faite, en
      // cours, ou la suivante de l'étape en cours.
      if (numero > 1) {
        let trait = htmlToFragment(traitTemplate);
        trait.firstElementChild.classList.add(numero <= data.etape + 1 ? "bg-om-bleu" : "bg-om-fond-doux");
        liste.append(trait);
      }

      let etape = htmlToFragment(genericRenderer(etapeTemplate, { numero, libelle }));
      let pastille = etape.querySelector('[data-role="pastille"]');
      let coche = etape.querySelector('[data-role="coche"]');
      let texte = etape.querySelector('[data-role="libelle"]');

      if (numero === data.etape) {
        pastille.classList.add("bg-om-bleu", "text-white");
        texte.classList.add("font-semibold", "text-om-texte");
        etape.firstElementChild.setAttribute("aria-current", "step");
        coche.remove();
      } else if (numero < data.etape) {
        // Faite : le numéro sur mobile, la coche à partir de la tablette.
        pastille.classList.add("bg-om-bleu", "text-white");
        texte.classList.add("hidden", "md:inline", "text-om-texte-doux");
        etape.querySelector('[data-role="chiffre"]').classList.add("md:hidden");
      } else {
        pastille.classList.add("bg-om-fond-doux", "text-om-texte-doux");
        texte.classList.add("hidden", "md:inline", "text-om-texte-doux");
        coche.remove();
      }

      liste.append(etape);
    });

    return fragment;
  },
};

export { EtapesTunnelView };
