---
description: Termine une US (ex. /terminer-us DEC-B) : commit, push, PR, merge, mise à jour de main.
---

1. Vérifier que `verifier-us` est au vert.
2. Commit explicite en français, puis `git push -u origin <CODE-US>`.
3. Ouvrir la PR vers `main`, attendre l'accord de Mag avant le merge.
4. Après le merge : `git checkout main && git pull`.