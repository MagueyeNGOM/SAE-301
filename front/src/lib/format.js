/**
 * Petites fonctions de mise en forme, sans dépendance.
 */

const formatEuros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/**
 * 100 -> « 100,00 € »
 */
export function formaterPrix(prix) {
  return formatEuros.format(prix);
}
