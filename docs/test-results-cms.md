# Vérification CMS réussie

Date UTC : 2026-09-26T21:05:08.765Z

Environnement : serveur Astro local, moteur Cloudflare workerd, base D1 locale. EmDash 0.41.0.

Protocole : initialisation/connexion natives avec une passkey WebAuthn virtuelle Chromium, appels API authentifiés, puis requêtes HTTP anonymes indépendantes. Aucun contournement de l’authentification et aucun envoi d’email.

- Connexion native par passkey et accès authentifié au tableau de bord.
- pages/01M3FQPBAMXVGE5MHB5HEDZTJ1 : l’enregistrement d’un brouillon ne modifie pas la page publique.
- pages/01M3FQPBAMXVGE5MHB5HEDZTJ1 : aperçu natif signé rendu avec le brouillon et protégé du cache public.
- pages/01M3FQPBAMXVGE5MHB5HEDZTJ1 : un jeton d’aperçu invalide ne dévoile pas le brouillon.
- pages/01M3FQPBAMXVGE5MHB5HEDZTJ1 : le lien signé ne donne accès qu’à son propre contenu.
- pages/01M3FQPBAMXVGE5MHB5HEDZTJ1 : publication visible dès la requête anonyme suivante, sans reconstruction.
- pages/01M3FQPBAMXVGE5MHB5HEDZTJ1 : contenu initial restauré puis republié.
- posts/01M3FQPAS5F2RVH5VZH1WSFB3T : l’enregistrement d’un brouillon ne modifie pas la page publique.
- posts/01M3FQPAS5F2RVH5VZH1WSFB3T : aperçu natif signé rendu avec le brouillon et protégé du cache public.
- posts/01M3FQPAS5F2RVH5VZH1WSFB3T : un jeton d’aperçu invalide ne dévoile pas le brouillon.
- posts/01M3FQPAS5F2RVH5VZH1WSFB3T : le lien signé ne donne accès qu’à son propre contenu.
- posts/01M3FQPAS5F2RVH5VZH1WSFB3T : publication visible dès la requête anonyme suivante, sans reconstruction.
- posts/01M3FQPAS5F2RVH5VZH1WSFB3T : contenu initial restauré puis republié.
- API d’administration refusée aux visiteurs anonymes (401/403).

Les données éditoriales modifiées pour le test sont restaurées. Les révisions du test restent dans l’historique local. Le compte fictif et sa passkey restent uniquement dans l’environnement de développement.

Limite : ces vérifications locales ne remplacent pas une recette sur les ressources Cloudflare de préproduction après connexion du compte.
