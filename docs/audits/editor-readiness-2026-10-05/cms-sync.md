# Vérification CMS réussie

Date UTC : 2026-10-05T01:38:34.018Z

Environnement : serveur Astro local, moteur Cloudflare workerd, base D1 locale. EmDash 0.41.0.

Protocole : initialisation/connexion natives avec une passkey WebAuthn virtuelle Chromium, appels API authentifiés, puis requêtes HTTP anonymes indépendantes. Aucun contournement de l’authentification et aucun envoi d’email.

- Connexion native par passkey et accès authentifié au tableau de bord.
- pages/01M44V2MTFCFR6YA6XYVXZDS63 : l’enregistrement d’un brouillon ne modifie pas la page publique.
- pages/01M44V2MTFCFR6YA6XYVXZDS63 : aperçu natif signé rendu avec le brouillon et protégé du cache public.
- pages/01M44V2MTFCFR6YA6XYVXZDS63 : un jeton d’aperçu invalide ne dévoile pas le brouillon.
- pages/01M44V2MTFCFR6YA6XYVXZDS63 : le lien signé ne donne accès qu’à son propre contenu.
- pages/01M44V2MTFCFR6YA6XYVXZDS63 : publication visible dès la requête anonyme suivante, sans reconstruction.
- pages/01M44V2MTFCFR6YA6XYVXZDS63 : contenu initial restauré puis republié.
- posts/01M44V2MB88CW9WRGT1P0MAW7H : l’enregistrement d’un brouillon ne modifie pas la page publique.
- posts/01M44V2MB88CW9WRGT1P0MAW7H : aperçu natif signé rendu avec le brouillon et protégé du cache public.
- posts/01M44V2MB88CW9WRGT1P0MAW7H : un jeton d’aperçu invalide ne dévoile pas le brouillon.
- posts/01M44V2MB88CW9WRGT1P0MAW7H : le lien signé ne donne accès qu’à son propre contenu.
- posts/01M44V2MB88CW9WRGT1P0MAW7H : publication visible dès la requête anonyme suivante, sans reconstruction.
- posts/01M44V2MB88CW9WRGT1P0MAW7H : contenu initial restauré puis republié.
- Page collections : sections, images, bouton et corps enrichi : brouillon isolé, aperçu signé fidèle et publication immédiate.
- Page collections : sections, images, bouton et corps enrichi : champs vidés respectés après publication, sans valeur de secours éditoriale.
- Page collections : sections, images, bouton et corps enrichi : contenu initial restauré.
- Page showroom : sections, images, bouton et corps enrichi : brouillon isolé, aperçu signé fidèle et publication immédiate.
- Page showroom : sections, images, bouton et corps enrichi : champs vidés respectés après publication, sans valeur de secours éditoriale.
- Page showroom : sections, images, bouton et corps enrichi : contenu initial restauré.
- Page catalogue : sections, images, bouton et corps enrichi : brouillon isolé, aperçu signé fidèle et publication immédiate.
- Page catalogue : sections, images, bouton et corps enrichi : champs vidés respectés après publication, sans valeur de secours éditoriale.
- Page catalogue : sections, images, bouton et corps enrichi : contenu initial restauré.
- Page journal : sections, images, bouton et corps enrichi : brouillon isolé, aperçu signé fidèle et publication immédiate.
- Page journal : sections, images, bouton et corps enrichi : champs vidés respectés après publication, sans valeur de secours éditoriale.
- Page journal : sections, images, bouton et corps enrichi : contenu initial restauré.
- Accueil responsive : CTA des sections et sections ajoutées : brouillon isolé, aperçu signé fidèle et publication immédiate.
- Accueil responsive : CTA des sections et sections ajoutées : champs vidés respectés après publication, sans valeur de secours éditoriale.
- Accueil responsive : CTA des sections et sections ajoutées : contenu initial restauré.
- Article : appel à l’action éditorial : brouillon isolé, aperçu signé fidèle et publication immédiate.
- Article : appel à l’action éditorial : champs vidés respectés après publication, sans valeur de secours éditoriale.
- Article : appel à l’action éditorial : contenu initial restauré.
- Modèle lié : image et légende : brouillon isolé, aperçu signé fidèle et publication immédiate.
- Modèle lié : image et légende : champs vidés respectés après publication, sans valeur de secours éditoriale.
- Modèle lié : image et légende : contenu initial restauré.
- Configuration : e-mail public et libellé Lire l’article : brouillon isolé, aperçu signé fidèle et publication immédiate.
- Configuration : libellé Lire l’article vidé après publication ; adresse e-mail publique obligatoire conservée et connectée.
- Configuration : e-mail public et libellé Lire l’article : contenu initial restauré.
- Formulaire catalogue : erreurs éditables du nom et de l’e-mail : brouillon isolé, aperçu signé fidèle et publication immédiate.
- Formulaire catalogue : erreurs éditables du nom et de l’e-mail : contenu initial restauré.
- API d’administration refusée aux visiteurs anonymes (401/403).

Les données éditoriales modifiées pour le test sont restaurées. Les révisions du test restent dans l’historique local. Le compte fictif et sa passkey restent uniquement dans l’environnement jetable.

Limite : ces vérifications locales ne remplacent pas une recette sur les ressources Cloudflare de préproduction après connexion du compte.
