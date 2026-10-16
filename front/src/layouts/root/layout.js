import { htmlToFragment } from "../../lib/utils.js";
import template from "./template.html?raw";

/**
 * Layout principal : la page affichée.
 *
 * Le slot sans nom est laissé au routeur, qui y place la page.
 *
 * @returns {DocumentFragment}
 */
export function RootLayout() {
  return htmlToFragment(template);
}
