# Révision éditoriale et SEO — 28 septembre 2026

## Périmètre

Six familles et onze modèles : textes spécifiques, onze liens contextuels vers les fiches locales, titres et descriptions du panneau SEO natif. Suppression du doublon de la précision commune sous chaque carte lorsque cette même phrase apparaît déjà après la sélection. Le H1 et les titres SEO sont indépendants ; le titre du panneau natif pilote désormais aussi `<title>`.

La stratégie complète et ses limites sont dans [Stratégie de contenu et SEO](seo-content-strategy.md). Les règles de la migration sont dans [Contenus des familles et des modèles](collection-editorial.md).

## Vérifications sur la copie jetable

- Migration native 0004 sur `/tmp/cattelan-models-integration-NXr8ZO`, port 4331, avec sa propre base, ses médias, ses secrets et sa session déjà inscrite. Aucune nouvelle inscription ni écriture de test sur la base principale.
- Simulation : dix-sept entrées à modifier. Application : dix-sept entrées enregistrées et publiées, champs non concernés, médias, statuts et relations ordonnées conservés. Après restauration des valeurs du test, seconde application : zéro modification.
- Réponses publiques des dix-sept pages : textes complets, titres et descriptions SEO attendus, titre de partage cohérent, liens contextuels HTTP 200, prévisualisation toujours `noindex`.
- Famille Tables : brouillon absent du public, aperçu signé affichant la nouvelle introduction, publication immédiate, restauration des valeurs.
- Panneau SEO natif : changement immédiat de `<title>`, du titre de partage et de la description ; H1 inchangé ; effacement rétablissant les métadonnées éditoriales de repli. Les autres valeurs du panneau sont conservées par l'import.
- Chromium et WebKit : 1440 × 900 et 390 × 844, clair/sombre, quatre routes représentatives (`/collections/`, Tables, Chaises et tabourets, Skorpio), liens contextuels dans le même onglet, aucun débordement horizontal ni erreur JavaScript.
- Huit [captures de contenu](screenshots/editorial-2026-09-28/README.md), avec mouvement réduit pour stabiliser l'image.
- 37 tests unitaires, dont huit couvrant les baselines, conflits, brouillons, révisions, liens, pagination des relations et conservation des valeurs dans la migration éditoriale.
- Validation du seed : six collections et vingt-neuf entrées, sans modification ni application du seed.
- Vérification Astro : soixante fichiers, zéro erreur, avertissement ou indication. Compilation de production réussie ; avertissement connu de découpage des fichiers JavaScript au-delà de 500 ko.

La première exécution navigateur a subi une fermeture du serveur de développement. Après redémarrage, les contrôles de contenu/publication ont passé ; une assertion de test comparait ensuite `innerText` transformé en majuscules au nom original. Elle utilise désormais `textContent`, puis la partie visuelle a été relancée seule et a passé dans les deux moteurs. Aucune modification du site n'était nécessaire pour cette assertion.

## État de la base principale

L'import 0003 et la révision 0004 sont désormais publiés dans la base principale de l'aperçu privé, le 28 septembre 2026. L'utilisateur a explicitement autorisé l'accès technique local natif d'EmDash : un compte de développement distinct a été créé, sans modifier son administrateur personnel ni ses passkeys. Une sauvegarde cohérente précède l'opération ; le contrôle de conservation est réussi. Les simulations après publication proposent zéro modification. La session technique a ensuite été fermée et son fichier de cookie supprimé.

Le [rapport de publication](test-results-publication.md) distingue les vérifications sur les pages réellement servies par l'aperçu principal des tests de brouillon/publication effectués sur la copie jetable. Les captures citées dans la section précédente restent celles de cette copie, conservées comme preuve historique.

Les cinq articles et toutes les pages sont conservés. Leurs liens contextuels ainsi que les informations pratiques, images du showroom et PDF définitif restent des éléments de la stratégie à compléter. Aucune recherche de volumes de mots-clés, mesure de classement ou mesure Search Console n'a été réalisée. Le site privé reste non indexable ; aucun déploiement, domaine, CRM ou compte externe n'a été connecté.

Les flux catalogue/contact/PDF n'ont pas changé dans cette révision. Leur validation isolée précédente reste décrite dans les rapports catalogue et modèles ; ils n'ont pas été retestés avec des contacts sur la base principale.
