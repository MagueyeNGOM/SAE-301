import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import template from "./template.html?raw";

export const StatistiquesView = {
  dom(stats) {
    const fragment = htmlToFragment(genericRenderer(template, { total: stats?.total ?? "", orders: stats?.orders ?? "" }));
    if (stats === null) {
      fragment.querySelector("dl").remove();
      fragment.querySelector('[data-role="unavailable"]').hidden = false;
    }
    return fragment;
  },
};
