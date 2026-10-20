---
name: verifier-us
description: Vérifie la Definition of Done d'une user story. À utiliser avant de terminer une US ou quand Mag demande si une US est finie.
---

# Vérifier une US
C'est l'agent qui fait toute la vérification lui-même, sans rien renvoyer à Mag, y compris les tests sur 3 navigateurs (point 7). Seul ce qui est réellement impossible à l'agent (ex. Safari absent du poste, base de données ou serveur inaccessible) est signalé à Mag avec la raison.

1. Build : `npm run build` dans `front/` sans erreur ; noter les avertissements.
2. HTML valide W3C : pour chaque page ou composant touché, récupérer le HTML réellement rendu (le site est une SPA : le `dist/index.html` seul ne suffit pas, il faut le DOM final, par exemple via un navigateur headless) et l'envoyer au validateur Nu (https://validator.w3.org/nu/?out=json, en POST `text/html`). Corriger toutes les erreurs ; justifier chaque avertissement conservé.
3. CSS valide W3C : envoyer le CSS compilé (`dist/assets/*.css`) à https://jigsaw.w3.org/css-validator/ (profil css3svg, `output=json`). Distinguer les erreurs réelles des faux positifs dus à Tailwind (`@theme`, `@layer`, propriétés personnalisées), expliquer chaque faux positif, corriger le reste.
4. Charte OM (`.agents/rules/charte-om.md`) : couleurs, espacements et rayons via variables, pas de valeur en dur ; HTML sémantique, un `<label>` par champ, `alt` sur les images. Rendu mobile, tablette, desktop (captures aux 3 largeurs si possible).
5. Formulaires : validation client et serveur identiques, erreurs en français ; tester aussi côté serveur avec une requête forgée.
6. Pages et actions réservées refusées sans droits (tester l'accès direct par URL) ; règles de `securite.md` et `metier.md`.
7. Tester sur 3 navigateurs, par l'agent : Chrome, Edge et Firefox installés sur le poste, en mode headless (`--screenshot`, ou CDP pour Chrome/Edge), sur chaque page touchée et dans chaque état de l'US. Servir `front/dist/` avec une API simulée si le back n'est pas joignable, et le dire dans le compte rendu. Regarder les captures (rendu, pas d'erreur console). Si un des trois navigateurs manque, remplacer par un autre installé, sinon le signaler.
8. Compte rendu court : ce qui passe, ce qui reste à corriger, ce qui n'a pas pu être vérifié et pourquoi (le test manuel final dans le vrai site déployé reste à Mag). Ne jamais déclarer « valide W3C » sans avoir obtenu la réponse du validateur.
