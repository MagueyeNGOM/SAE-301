import { htmlToFragment } from "../../lib/utils.js";
import { HeaderView } from "../../ui/header/index.js";
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
  return fragment;
}
