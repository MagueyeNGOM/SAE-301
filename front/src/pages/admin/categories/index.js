import { CategoryData } from "../../../data/category.js";
import { genericRenderer, htmlToFragment } from "../../../lib/utils.js";
import { ChampFormulaireView } from "../../../ui/champ-formulaire/index.js";
import template from "./template.html?raw";
import itemTemplate from "./item.html?raw";

export function CategoriesSection(onUnauthorized) {
  const M = {
    categories: [], loaded: false, loadError: "", formError: "", deleteError: "", success: "",
    draft: { nom: "", description: "" }, editing: null, deleting: null, busy: false,
  };
  const V = { root: null };
  const C = {};

  C.error = function (error) {
    if (error.statut === 401 || error.statut === 403) onUnauthorized(error);
    return error.message;
  };

  C.load = async function () {
    try {
      M.categories = (await CategoryData.all()).categories;
      M.loaded = true;
      M.loadError = "";
    } catch (error) {
      M.loadError = C.error(error);
    }
  };

  C.edit = function (category = null) {
    M.editing = category?.id ?? null;
    M.draft = { nom: category?.nom ?? "", description: category?.description ?? "" };
    M.formError = "";
    M.success = "";
    V.refresh("#category-name");
  };

  C.save = async function (event) {
    event.preventDefault();
    if (M.busy) return;
    const name = M.draft.nom.trim();
    const description = M.draft.description.trim();
    M.formError = "";
    M.success = "";
    if (!/[\p{L}\p{N}]/u.test(name) || [...name].length > 60 || /[\x00-\x1F\x7F]/.test(name)) {
      M.formError = "Saisissez un nom de 1 à 60 caractères contenant une lettre ou un chiffre.";
    } else if (!description || [...description].length > 255 || /[\x00-\x1F\x7F]/.test(description)) {
      M.formError = "Saisissez une description de 1 à 255 caractères, sur une seule ligne.";
    } else {
      M.busy = true;
      V.refresh();
      try {
        const data = { nom: name, description };
        if (M.editing !== null) data.id = M.editing;
        M.categories = (await CategoryData.save(data)).categories;
        M.success = M.editing === null ? "Catégorie créée." : "Catégorie modifiée.";
        M.editing = null;
        M.draft = { nom: "", description: "" };
        M.deleting = null;
      } catch (error) {
        M.formError = C.error(error);
      } finally {
        M.busy = false;
      }
    }
    V.refresh(M.formError ? '[data-role="form-error"]' : '[data-role="success"]');
  };

  C.delete = async function () {
    if (M.busy || !M.deleting) return;
    M.busy = true;
    M.deleteError = "";
    M.success = "";
    V.refresh();
    try {
      const id = M.deleting.id;
      M.categories = (await CategoryData.delete(id)).categories;
      M.deleting = null;
      if (M.editing === id) {
        M.editing = null;
        M.draft = { nom: "", description: "" };
      }
      M.success = "Catégorie supprimée.";
    } catch (error) {
      M.deleteError = C.error(error);
    } finally {
      M.busy = false;
    }
    V.refresh(M.deleteError ? '[data-role="delete-error"]' : '[data-role="success"]');
  };

  V.dom = function () {
    const fragment = htmlToFragment(template);
    const root = fragment.firstElementChild;
    root.querySelector('[data-role="body"]').hidden = !M.loaded;
    root.querySelector('[data-action="add"]').hidden = !M.loaded;
    const loadError = root.querySelector('[data-role="load-error"]');
    loadError.hidden = !M.loadError;
    loadError.querySelector('[role="alert"]').textContent = M.loadError;
    for (const [role, message] of [["success", M.success], ["form-error", M.formError], ["delete-error", M.deleteError]]) {
      const element = root.querySelector(`[data-role="${role}"]`);
      element.textContent = message;
      element.hidden = !message;
      element.tabIndex = -1;
    }
    const list = root.querySelector('[data-role="list"]');
    for (const category of M.categories) {
      const item = htmlToFragment(genericRenderer(itemTemplate, { ...category, unit: category.nombre === 1 ? "produit" : "produits" }));
      item.querySelector('[data-action="edit"]').addEventListener("click", () => C.edit(category));
      item.querySelector('[data-action="delete"]').addEventListener("click", () => {
        M.deleting = category;
        M.deleteError = "";
        M.success = "";
        V.refresh('[data-role="confirmation"]');
      });
      list.append(item);
    }
    root.querySelector('[data-role="empty"]').hidden = M.categories.length !== 0;
    for (const [slot, id, label, key, max] of [
      ["name", "category-name", "Nom", "nom", 60],
      ["description", "category-description", "Description", "description", 255],
    ]) {
      const field = ChampFormulaireView.dom({ id, libelle: label, valeur: M.draft[key], placeholder: slot === "name" ? "Nom de la catégorie" : "Courte description" });
      const input = field.querySelector("input");
      input.required = true;
      input.maxLength = max;
      input.addEventListener("input", () => { M.draft[key] = input.value; });
      root.querySelector(`slot[name="${slot}"]`).replaceWith(field);
    }
    root.querySelector("form").addEventListener("submit", C.save);
    root.querySelector("#category-form-title").textContent = M.editing === null ? "Nouvelle catégorie" : "Modifier la catégorie";
    root.querySelector('[data-action="add"]').addEventListener("click", () => C.edit());
    root.querySelector('[data-action="cancel-edit"]').addEventListener("click", () => C.edit());
    root.querySelector('[data-action="retry"]').addEventListener("click", async () => {
      await C.load();
      V.refresh(M.loadError ? '[data-role="load-error"] [role="alert"]' : "#categories-title");
    });
    root.querySelector('[data-role="confirmation"]').hidden = !M.deleting;
    root.querySelector("#category-delete-title").textContent = M.deleting ? `Supprimer la catégorie « ${M.deleting.nom} » ?` : "Confirmer la suppression";
    root.querySelector('[data-action="confirm-delete"]').addEventListener("click", C.delete);
    root.querySelector('[data-action="cancel-delete"]').addEventListener("click", () => {
      M.deleting = null;
      M.deleteError = "";
      V.refresh('[data-action="add"]');
    });
    for (const control of root.querySelectorAll("button, input")) control.disabled = M.busy;
    root.setAttribute("aria-busy", String(M.busy));
    V.root = root;
    return fragment;
  };

  V.refresh = function (focus) {
    if (!V.root?.isConnected) return;
    const previous = V.root;
    previous.replaceWith(V.dom());
    if (focus) {
      const target = V.root.querySelector(focus);
      if (target && !target.matches("input, button")) target.tabIndex = -1;
      target?.focus();
    }
  };

  return { load: C.load, dom: V.dom };
}
