# Initialisation CMS vérifiée — synchronisation à tester

Date UTC : 2026-10-05T01:17:32.842Z

Environnement : serveur Astro local, moteur Cloudflare workerd, base D1 locale. EmDash 0.41.0.

Protocole : initialisation/connexion natives avec une passkey WebAuthn virtuelle Chromium, appels API authentifiés, puis requêtes HTTP anonymes indépendantes. Aucun contournement de l’authentification et aucun envoi d’email.

- Initialisation native EmDash et création du compte de test local avec une passkey WebAuthn.
- Connexion native par passkey et accès authentifié au tableau de bord.
- API d’administration refusée aux visiteurs anonymes (401/403).

Les données éditoriales modifiées pour le test sont restaurées. Les révisions du test restent dans l’historique local. Le compte fictif et sa passkey restent uniquement dans l’environnement jetable.

Limite : ces vérifications locales ne remplacent pas une recette sur les ressources Cloudflare de préproduction après connexion du compte.
