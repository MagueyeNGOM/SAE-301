import { htmlToFragment } from "../../lib/utils.js";
import { HeaderView } from "../../ui/header/index.js";
import { PiedDePageView } from "../../ui/pied-de-page/index.js";
import template from "./template.html?raw";

/**
 * Layout principal : en-tête et page affichée.
 *
 * Le slot sans nom est laissé au routeur, qui y place la page.
 *
 * @returns {DocumentFragment}
 */
export function RootLayout() {
  let fragment = htmlToFragment(template);
  fragment.querySelector('slot[name="header"]').replaceWith(HeaderView.dom());
  fragment.querySelector('slot[name="pied"]').replaceWith(PiedDePageView.dom());
  return fragment;
}
