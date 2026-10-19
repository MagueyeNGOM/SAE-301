import { htmlToFragment } from "../../lib/utils.js";
import { PiedDePageView } from "../../ui/pied-de-page/index.js";
import template from "./template.html?raw";

/**
 * Layout du tunnel de commande (panier, connexion, inscription, récapitulatif,
 * confirmation) : en-tête allégé et pied de page, sans le menu de la boutique.
 * Les étapes de la commande sont affichées par chaque page, qui connaît la sienne.
 *
 * Le slot sans nom est laissé au routeur, qui y place la page.
 *
 * @returns {DocumentFragment}
 */
export function TunnelLayout() {
  let fragment = htmlToFragment(template);
  fragment.querySelector('slot[name="pied"]').replaceWith(PiedDePageView.dom());
  return fragment;
}
