---
trigger: model_decision
description: Sécurité, comptes et formulaires. À lire dès qu'on touche à la connexion, aux sessions, aux formulaires, à la base de données ou au back-office.
---

# Sécurité
- Mots de passe hashés avec bcrypt. Régénérer l'ID de session à la connexion.
- Requêtes SQL préparées. Échapper toute donnée affichée.
- Formulaires validés côté client et côté serveur, erreurs claires en français.
- Pages et actions réservées inaccessibles sans droits (tester l'accès direct par URL).
- `/admin` a sa propre authentification, séparée des clients.