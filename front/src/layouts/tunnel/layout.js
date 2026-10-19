import { htmlToFragment } from "../../lib/utils.js";
import { PiedDePageView } from "../../ui/pied-de-page/index.js";
import template from "./template.html?raw";

/**
 * Layout du tunnel de commande (connexion, inscription) : en-tête allégé,
 * étapes de la commande et pied de page, sans le menu de la boutique.
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
