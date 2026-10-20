import { AdminAuthData } from "../../data/admin-auth.js";
import { StatsData } from "../../data/stats.js";
import { genericRenderer, htmlToFragment, redirect } from "../../lib/utils.js";
import { FormulaireConnexionView } from "../../ui/formulaire-connexion/index.js";
import { StatistiquesView } from "../../ui/statistiques/index.js";
import template from "./template.html?raw";
import sectionTemplate from "./section.html?raw";
import { CategoriesSection } from "./categories/index.js";
import { ProductsSection } from "./products/index.js";

const sections = {
  categories: "Catégories",
  produits: "Produits",
  commandes: "Commandes",
  statistiques: "Statistiques",
};

// Chaque navigation possède son état pour éviter les réponses d'une ancienne page.
export async function AdminPage({ section = "" } = {}) {
  const M = { session: null, stats: null, email: "", message: "", busy: false };
  const C = {};
  const V = { root: null };
  const categories = CategoriesSection((error) => {
    M.session = { connecte: false };
    M.message = error.message;
    V.refresh();
  });
  const products = ProductsSection((error) => {
    M.session = { connecte: false };
    M.message = error.message;
    V.refresh();
  });

  C.load = async function () {
    try {
      M.session = await AdminAuthData.me();
      if (M.session.connecte && section === "") M.stats = await StatsData.fetch();
      if (M.session.connecte && section === "categories") await categories.load();
      if (M.session.connecte && section === "produits") await products.load();
    } catch (error) {
      if (error.statut === 401 || error.statut === 403) M.session = { connecte: false };
      M.message = error.message;
    }
  };

  C.login = async function (email, password) {
    if (M.busy) return;
    M.email = email.trim();
    M.message = "";
    if (!/^\S+@\S+\.\S+$/.test(M.email) || M.email.length > 190) {
      M.message = "Saisissez une adresse e-mail valide.";
    } else if (!password || new TextEncoder().encode(password).length > 72) {
      M.message = "Saisissez votre mot de passe (72 octets maximum).";
    } else {
      M.busy = true;
      V.refresh();
      try {
        await AdminAuthData.login(M.email, password);
        redirect(section ? `/admin/${section}` : "/admin");
        return;
      } catch (error) {
        M.message = error.message;
      } finally {
        M.busy = false;
      }
    }
    V.refresh();
    V.root.querySelector('[role="alert"]')?.focus();
  };

  C.logout = async function () {
    if (M.busy) return;
    M.busy = true;
    V.refresh();
    try {
      await AdminAuthData.logout();
      redirect("/admin");
    } catch (error) {
      M.message = error.message;
      M.busy = false;
      V.refresh();
    }
  };

  V.create = function () {
    const fragment = htmlToFragment(template);
    const connected = M.session?.connecte === true;
    fragment.firstElementChild.dataset.authenticated = String(connected);
    fragment.querySelector("main").dataset.login = String(!connected);
    fragment.querySelector("nav").hidden = !connected;
    const logout = fragment.querySelector('[data-action="logout"]');
    logout.hidden = !connected;
    logout.disabled = M.busy;
    logout.addEventListener("click", C.logout);
    const alert = fragment.querySelector('[role="alert"]');
    alert.textContent = M.message;
    alert.hidden = !M.message;

    let content;
    if (!connected) {
      content = FormulaireConnexionView.dom({ login: M.email, busy: M.busy }, { surConnexion: C.login });
      alert.classList.remove("mb-4");
      content.querySelector("form").insertBefore(alert, content.querySelector("button"));
    } else if (section === "") {
      content = StatistiquesView.dom(M.stats);
    } else if (section === "categories") {
      content = categories.dom();
    } else if (section === "produits") {
      content = products.dom();
    } else {
      content = htmlToFragment(genericRenderer(sectionTemplate, {
        title: Object.hasOwn(sections, section) ? sections[section] : "Page introuvable",
        description: Object.hasOwn(sections, section)
          ? "À venir : cette section sera disponible dans une prochaine étape."
          : "Cette section d’administration n’existe pas.",
      }));
    }
    fragment.querySelector('slot[name="content"]').replaceWith(content);
    // La reconstruction d'une page doit conserver les URL avec le chemin du projet.
    for (const link of fragment.querySelectorAll("a[data-link]")) {
      const path = link.getAttribute("href");
      link.setAttribute("href", import.meta.env.BASE_URL.replace(/\/$/, "") + path);
      if (path === (section ? `/admin/${section}` : "/admin")) link.setAttribute("aria-current", "page");
    }
    return fragment;
  };

  V.refresh = function () {
    if (!V.root?.isConnected) return;
    const fragment = V.create();
    const root = fragment.firstElementChild;
    V.root.replaceWith(fragment);
    V.root = root;
  };

  await C.load();
  const fragment = V.create();
  V.root = fragment.firstElementChild;
  return fragment;
}
