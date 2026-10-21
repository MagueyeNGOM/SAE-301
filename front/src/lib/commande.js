import { AuthData } from "../data/auth.js";
import { CartData } from "../data/cart.js";
import { MessageView } from "../ui/message/index.js";

/**
 * Affichage commun des commandes de l'espace personnel (SUI-B, SUI-C) et « Commander à nouveau » (SUI-A).
 */

// Avancement d'une commande : nombre d'étapes franchies sur 3.
export const AVANCEMENT = { "en cours": 1, disponible: 2, "retirée": 3, "annulée": 0 };

// Classes écrites en entier : Tailwind ne génère que celles qu'il trouve telles quelles.
export const BADGES = {
  "en cours": "bg-om-bleu-clair/15 text-om-info",
  disponible: "bg-om-succes-fond text-om-succes",
  "retirée": "bg-om-fond-doux text-om-texte-doux",
  "annulée": "bg-om-erreur-fond text-om-erreur",
};

const ETAPES = ["En cours", "Disponible", "Retirée"];

export function formaterDate(valeur) {
  return new Date(valeur.replace(" ", "T")).toLocaleDateString("fr-FR");
}

export function libelleStatut(statut) {
  return statut.charAt(0).toUpperCase() + statut.slice(1);
}

// Commander à nouveau (SUI-A) : transfère la commande dans le panier et renvoie les messages
// à afficher, [{ type, texte }]. Une erreur d'API (session expirée, commande introuvable) remonte.
export async function recommander(numero) {
  let { lignes } = await AuthData.recommander(numero);
  let { ajoutees, messages } = CartData.ajouterCommande(lignes);
  let resultat = messages.map((texte) => ({ type: "erreur", texte }));
  if (ajoutees > 0) {
    resultat.unshift({ type: "succes", texte: `${ajoutees} article${ajoutees > 1 ? "s ont été ajoutés" : " a été ajouté"} à votre panier. Les prix et les stocks affichés sont ceux d'aujourd'hui.` });
  } else {
    resultat.unshift({ type: "erreur", texte: "Aucun article n'a pu être ajouté à votre panier." });
  }
  return resultat;
}

// Messages de « Commander à nouveau », suivis d'un lien vers le panier si des articles y sont entrés.
export function messagesDom(messages) {
  let fragment = document.createDocumentFragment();
  for (let m of messages) fragment.append(MessageView.dom(m));
  if (messages[0]?.type === "succes") {
    let lien = document.createElement("a");
    lien.href = "/panier";
    lien.dataset.link = "";
    lien.className = "w-fit text-[13px] font-semibold text-om-bleu hover:underline";
    lien.textContent = "Voir mon panier ›";
    fragment.append(lien);
  }
  return fragment;
}

// Trois petites barres de progression (maquette P2-07).
export function barres(statut) {
  return [0, 1, 2].map((i) => {
    let barre = document.createElement("span");
    barre.className = "h-1.5 w-[46px] rounded-[3px] " + (i < AVANCEMENT[statut] ? "bg-om-bleu" : "bg-om-fond-doux");
    return barre;
  });
}

// Suivi à 3 étapes (maquettes P2-06 et P2-08 : cercle, trait, cercle…).
// sombre : texte clair pour un fond bleu foncé.
export function suivi(statut, sombre) {
  let franchies = AVANCEMENT[statut];
  let couleurTexte = sombre ? "text-om-texte-discret " : "text-om-texte ";
  return ETAPES.flatMap((libelle, i) => {
    let etape = document.createElement("li");
    etape.className = "flex flex-col items-center gap-2 text-xs";
    let cercle = document.createElement("span");
    cercle.className = "flex size-[26px] items-center justify-center rounded-full text-xs font-semibold " + (i < franchies ? "bg-om-bleu text-om-texte-discret" : "bg-om-fond-doux");
    cercle.textContent = i < franchies ? "✓" : "";
    let texte = document.createElement("span");
    texte.className = couleurTexte + (i < franchies ? "font-semibold" : "");
    texte.textContent = libelle;
    etape.append(cercle, texte);
    if (i === ETAPES.length - 1) return [etape];
    let trait = document.createElement("li");
    trait.setAttribute("aria-hidden", "true");
    trait.className = "mt-[11px] h-[3px] w-10 shrink-0 md:w-[70px] " + (i + 1 < franchies ? "bg-om-bleu" : "bg-om-fond-doux");
    return [etape, trait];
  });
}
