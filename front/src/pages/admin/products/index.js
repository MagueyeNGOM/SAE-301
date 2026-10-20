import { ProductData } from "../../../data/product.js";
import { genericRenderer, htmlToFragment } from "../../../lib/utils.js";
import { formaterPrix } from "../../../lib/format.js";
import { ChampFormulaireView } from "../../../ui/champ-formulaire/index.js";
import { PastilleStockView } from "../../../ui/pastille-stock/index.js";
import template from "./template.html?raw";
import itemTemplate from "./item.html?raw";

export function ProductsSection(onUnauthorized) {
  const M = { products: [], categories: [], sizes: [], threshold: 5, loaded: false, loadError: "", formError: "", deleteError: "", success: "", draft: null, deleting: null, busy: false };
  const V = { root: null };
  const C = {};

  C.error = (error) => {
    if (error.statut === 401 || error.statut === 403) onUnauthorized(error);
    return error.message;
  };

  C.load = async () => {
    try {
      const data = await ProductData.adminAll();
      M.products = data.produits;
      M.categories = data.categories;
      M.sizes = data.tailles;
      M.threshold = data.seuil_stock;
      M.loaded = true;
      M.loadError = "";
    } catch (error) { M.loadError = C.error(error); }
  };

  C.edit = async (id = null) => {
    if (M.busy) return;
    M.busy = true;
    M.formError = M.loadError = M.success = "";
    M.deleting = null;
    V.refresh();
    try {
      const product = id === null ? {
        nom: "", description: "", details: "", prix: "", categorie_id: "", seuil_stock: M.threshold,
        prix_flocage: null, nouveaute: false, variants: [], images: [],
      } : (await ProductData.adminFind(id)).produit;
      M.draft = { ...product, printing: product.prix_flocage !== null, images: product.images.map((file) => ({ file })) };
    } catch (error) { M.loadError = C.error(error); }
    finally { M.busy = false; }
    V.refresh(M.draft ? "#product-form-title" : '[data-role="load-error"] [role="alert"]');
  };

  C.cancel = () => { if (!M.busy) { M.draft = null; M.formError = ""; V.refresh('[data-action="add"]'); } };

  C.upload = async (event) => {
    if (M.busy) return;
    const files = [...event.target.files];
    if (!files.length) return;
    M.formError = "";
    M.busy = true;
    V.refresh();
    try {
      if (M.draft.images.length + files.length > 8) throw new Error("Choisissez 8 images maximum.");
      let total = M.draft.images.reduce((sum, image) => sum + (image.bytes ?? 0), 0);
      const added = [];
      for (const file of files) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2097152) throw new Error("Utilisez une image JPEG, PNG ou WebP de 2 Mo maximum.");
        total += file.size;
        if (total > 4194304) throw new Error("Les nouvelles images ne doivent pas dépasser 4 Mo au total.");
        const preview = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Impossible de lire cette image."));
          reader.readAsDataURL(file);
        });
        added.push({ data: preview.slice(preview.indexOf(",") + 1), preview, bytes: file.size });
      }
      M.draft.images.push(...added);
    } catch (error) { M.formError = error.message; }
    finally { M.busy = false; }
    V.refresh(M.formError ? '[data-role="form-error"]' : "#product-images");
  };

  C.save = async (event) => {
    event.preventDefault();
    if (M.busy) return;
    M.formError = M.success = "";
    const draft = M.draft;
    const price = (value, max) => value !== "" && value !== null && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= max && Math.abs(Number(value) * 100 - Math.round(Number(value) * 100)) < 0.00001;
    if (!/[\p{L}\p{N}]/u.test(draft.nom) || [...draft.nom.trim()].length > 120 || /[\x00-\x1F\x7F]/.test(draft.nom)) M.formError = "Saisissez un nom de 1 à 120 caractères contenant une lettre ou un chiffre.";
    else if (!/[\p{L}\p{N}]/u.test(draft.description) || [...draft.description.trim()].length > 20000 || [...(draft.details ?? "").trim()].length > 20000 || /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(draft.description + (draft.details ?? ""))) M.formError = "Vérifiez la description et les détails (20 000 caractères maximum par champ).";
    else if (!M.categories.some((category) => category.id === Number(draft.categorie_id))) M.formError = "Choisissez une catégorie existante.";
    else if (!price(draft.prix, 99999.99) || (draft.printing && !price(draft.prix_flocage, 999.99))) M.formError = "Vérifiez les prix : deux décimales maximum, prix jusqu’à 99 999,99 € et flocage jusqu’à 999,99 €.";
    else if (draft.seuil_stock === "" || !Number.isInteger(Number(draft.seuil_stock)) || Number(draft.seuil_stock) < 0 || Number(draft.seuil_stock) > 65535) M.formError = "Le seuil doit être un entier entre 0 et 65 535.";
    else if (!draft.variants.length || draft.variants.some((variant) => variant.quantite === "" || !Number.isInteger(Number(variant.quantite)) || Number(variant.quantite) < 0 || Number(variant.quantite) > 65535)) M.formError = "Choisissez au moins une taille avec un stock entier entre 0 et 65 535.";
    else if (!draft.images.length) M.formError = "Choisissez au moins une image.";
    else {
      M.busy = true;
      V.refresh();
      try {
        const data = {
          nom: draft.nom.trim(), description: draft.description.trim(), details: (draft.details ?? "").trim(),
          prix: Number(draft.prix), categorie_id: Number(draft.categorie_id), seuil_stock: Number(draft.seuil_stock),
          prix_flocage: draft.printing ? Number(draft.prix_flocage) : null, nouveaute: draft.nouveaute,
          variants: draft.variants.map((variant) => ({ taille_id: variant.taille_id, quantite: Number(variant.quantite) })),
          images: draft.images.map((image) => image.file ? { file: image.file } : { data: image.data }),
        };
        if (draft.id) data.id = draft.id;
        await ProductData.save(data);
        M.success = draft.id ? "Produit modifié." : "Produit créé.";
        M.draft = null;
        await C.load();
      } catch (error) { M.formError = C.error(error); }
      finally { M.busy = false; }
    }
    V.refresh(M.formError ? '[data-role="form-error"]' : '[data-role="success"]');
  };

  C.delete = async () => {
    if (M.busy || !M.deleting) return;
    M.busy = true;
    M.deleteError = M.success = "";
    V.refresh();
    try {
      await ProductData.delete(M.deleting.id);
      M.deleting = null;
      M.success = "Produit supprimé.";
      await C.load();
    } catch (error) { M.deleteError = C.error(error); }
    finally { M.busy = false; }
    V.refresh(M.deleteError ? '[data-role="delete-error"]' : '[data-role="success"]');
  };

  V.editor = (root) => {
    const draft = M.draft;
    root.querySelector("#product-form-title").textContent = draft.id ? "Modifier un produit" : "Ajouter un produit";
    for (const [slot, key, id, label, type, max] of [
      ["name", "nom", "product-name", "Nom du produit", "text", 120],
      ["price", "prix", "product-price", "Prix (€)", "number", 99999.99],
      ["threshold", "seuil_stock", "product-threshold", "Seuil « Bientôt épuisé » (stock total)", "number", 65535],
      ["printing", "prix_flocage", "product-printing-price", "Prix du flocage (€)", "number", 999.99],
    ]) {
      const field = ChampFormulaireView.dom({ id, libelle: label, type, valeur: draft[key] ?? "" });
      const input = field.querySelector("input");
      if (type === "text") input.maxLength = max;
      else { input.min = 0; input.max = max; input.step = key === "seuil_stock" ? "1" : "0.01"; }
      input.required = key !== "prix_flocage" || draft.printing;
      input.addEventListener("input", () => { draft[key] = input.value; });
      root.querySelector(`slot[name="${slot}"]`).replaceWith(field);
    }
    for (const key of ["description", "details"]) {
      const input = root.querySelector(`#product-${key}`);
      input.value = draft[key] ?? "";
      input.addEventListener("input", () => { draft[key] = input.value; });
    }
    const category = root.querySelector("#product-category");
    for (const item of M.categories) category.add(new Option(item.nom, item.id));
    category.value = draft.categorie_id;
    category.addEventListener("change", () => { draft.categorie_id = category.value; });
    const novelty = root.querySelector("#product-new");
    novelty.checked = draft.nouveaute;
    novelty.addEventListener("change", () => { draft.nouveaute = novelty.checked; });
    const printing = root.querySelector("#product-printing");
    printing.checked = draft.printing;
    root.querySelector('[data-role="printing-price"]').hidden = !draft.printing;
    printing.addEventListener("change", () => { draft.printing = printing.checked; V.refresh("#product-printing"); });
    for (const size of M.sizes) {
      const variant = draft.variants.find((value) => value.taille_id === size.id);
      const item = htmlToFragment('<div class="min-w-0 rounded-lg bg-white p-2"><label class="flex items-center gap-2 text-xs"><input type="checkbox"><span></span></label><label class="mt-2 flex flex-col gap-1 text-xs"><span></span><input type="number" min="0" max="65535" step="1" class="w-full rounded-lg border border-om-bordure-champ px-2 py-2"></label></div>');
      const [choice, quantity] = item.querySelectorAll("input");
      item.querySelector("span").textContent = size.libelle;
      item.querySelectorAll("span")[1].textContent = `Stock ${size.libelle}`;
      choice.id = `size-${size.id}`;
      quantity.id = `stock-${size.id}`;
      choice.checked = !!variant;
      quantity.value = variant?.quantite ?? 0;
      quantity.disabled = !variant;
      quantity.required = !!variant;
      quantity.dataset.inactive = String(!variant);
      choice.addEventListener("change", () => {
        draft.variants = draft.variants.filter((value) => value.taille_id !== size.id);
        if (choice.checked) {
          const uniqueId = M.sizes.find((value) => value.libelle === "Unique")?.id;
          draft.variants = size.id === uniqueId ? [] : draft.variants.filter((value) => value.taille_id !== uniqueId);
          draft.variants.push({ taille_id: size.id, quantite: quantity.value });
        }
        V.refresh(`#size-${size.id}`);
      });
      quantity.addEventListener("input", () => { const value = draft.variants.find((value) => value.taille_id === size.id); if (value) value.quantite = quantity.value; });
      root.querySelector('[data-role="variants"]').append(item);
    }
    const upload = root.querySelector("#product-images");
    upload.setAttribute("aria-describedby", "image-help");
    upload.addEventListener("change", C.upload);
    draft.images.forEach((image, position) => {
      const item = htmlToFragment('<li class="min-w-0 rounded-lg bg-white p-2"><img class="aspect-square w-full rounded-lg object-contain" width="160" height="160"><p class="my-2 text-xs"></p><div class="flex flex-wrap gap-2 text-xs text-om-bleu"><button type="button" data-image="up">←</button><button type="button" data-image="down">→</button><button type="button" data-image="remove" class="hover:underline">Retirer</button></div></li>');
      item.querySelector("img").src = image.preview ?? import.meta.env.BASE_URL + "images/produits/" + image.file;
      item.querySelector("img").alt = `Image ${position + 1} du produit`;
      item.querySelector("p").textContent = position === 0 ? "Image principale" : `Image ${position + 1}`;
      for (const [action, label, offset] of [["up", "Avancer", -1], ["down", "Reculer", 1], ["remove", "Retirer", 0]]) {
        const button = item.querySelector(`[data-image="${action}"]`);
        button.setAttribute("aria-label", `${label} l’image ${position + 1}`);
        button.dataset.inactive = String(offset !== 0 && (position + offset < 0 || position + offset >= draft.images.length));
        button.addEventListener("click", () => {
          if (offset === 0) draft.images.splice(position, 1);
          else [draft.images[position], draft.images[position + offset]] = [draft.images[position + offset], draft.images[position]];
          V.refresh("#product-images");
        });
      }
      root.querySelector('[data-role="images"]').append(item);
    });
    root.querySelector("form").addEventListener("submit", C.save);
  };

  V.dom = () => {
    const fragment = htmlToFragment(template);
    const root = fragment.firstElementChild;
    for (const [role, message] of [["success", M.success], ["form-error", M.formError], ["delete-error", M.deleteError]]) {
      const node = root.querySelector(`[data-role="${role}"]`);
      node.textContent = message;
      node.hidden = !message;
    }
    const error = root.querySelector('[data-role="load-error"]');
    error.hidden = !M.loadError;
    error.querySelector('[role="alert"]').textContent = M.loadError;
    root.querySelector('[data-role="list-panel"]').hidden = !M.loaded || !!M.draft;
    root.querySelector('[data-action="add"]').hidden = !M.loaded || !!M.draft;
    root.querySelector('[data-role="list-heading"]').hidden = !!M.draft;
    root.querySelector('[data-role="editor"]').hidden = !M.draft;
    root.querySelector('[data-role="empty"]').hidden = M.products.length !== 0;
    for (const product of M.products) {
      const item = htmlToFragment(genericRenderer(itemTemplate, { ...product, prix: formaterPrix(product.prix) }));
      item.querySelector('slot[name="stock"]').replaceWith(PastilleStockView.dom(product.stock));
      item.querySelector('[data-action="edit"]').addEventListener("click", () => C.edit(product.id));
      item.querySelector('[data-action="delete"]').addEventListener("click", () => { M.deleting = product; M.deleteError = M.success = ""; V.refresh('[data-role="confirmation"]'); });
      root.querySelector('[data-role="list"]').append(item);
    }
    const confirmation = root.querySelector('[data-role="confirmation"]');
    confirmation.hidden = !M.deleting;
    root.querySelector("#product-delete-title").textContent = M.deleting ? `Supprimer le produit « ${M.deleting.nom} » ?` : "Confirmer la suppression";
    if (M.draft) V.editor(root);
    root.querySelector('[data-action="add"]').addEventListener("click", () => C.edit());
    root.querySelector('[data-action="cancel-edit"]').addEventListener("click", C.cancel);
    root.querySelector('[data-action="back"]').addEventListener("click", C.cancel);
    root.querySelector('[data-action="confirm-delete"]').addEventListener("click", C.delete);
    root.querySelector('[data-action="cancel-delete"]').addEventListener("click", () => { M.deleting = null; M.deleteError = ""; V.refresh('[data-action="add"]'); });
    root.querySelector('[data-action="retry"]').addEventListener("click", async () => { await C.load(); V.refresh(M.loadError ? '[data-role="load-error"] [role="alert"]' : "#products-title"); });
    for (const control of root.querySelectorAll("button, input, select, textarea")) control.disabled = M.busy || control.dataset.inactive === "true";
    root.setAttribute("aria-busy", String(M.busy));
    V.root = root;
    return fragment;
  };

  V.refresh = (focus) => {
    if (!V.root?.isConnected) return;
    V.root.replaceWith(V.dom());
    if (focus) {
      const element = V.root.querySelector(focus);
      if (element && !element.matches("input, button")) element.tabIndex = -1;
      element?.focus();
    }
  };

  return { load: C.load, dom: V.dom };
}
