import { htmlToFragment } from "../../lib/utils.js";
import template from "./template.html?raw";

export function AdminLayout() {
  return htmlToFragment(template);
}