# Finalisation de la migration — 27 septembre 2026

La migration reste sur `feat/emdash-migration`, dans la [PR brouillon existante](https://github.com/omarmhammedi/CattelanMarocPreview/pull/1). Les corrections concernent la fidélité à la version B et le rendu des champs EmDash. Aucun contenu de la base de prévisualisation n’a été remplacé pour reproduire les textes du prototype.

## Fidélité visuelle

La [galerie de comparaison](screenshots/migration-2026-09-27/README.md) contient les captures originales et corrigées, aux mêmes dimensions, thèmes et positions dans chaque scène. Le fichier local et la [version B publiée](https://omarmhammedi.github.io/CattelanMarocPreview/version-b/) étaient identiques lors du contrôle.

- Tailles des titres, interlignages, espacements et composition de marque rétablis ; regroupement « Dessiné / en Italie. » conservé sur ordinateur et mobile.
- Proportions des cartes et cadrages associés aux familles restaurés, indépendamment de leur ordre dans le CMS.
- Dessin de la carte, quartier indicatif, repère, couleurs et pulsation restaurés. Le lien d’itinéraire reste celui du CMS.
- Agrandissement de l’accueil, révélations, rail horizontal, transition showroom, livre catalogue et défilement mobile conservés. Les paramètres d’animation échantillonnés correspondent à l’original, avec une longueur de rail adaptée aux six familles.
- La composition mobile conserve sa photographie principale ; les textes éditoriaux supplémentaires restent dans le flux. Le mouvement réduit conserve les contenus dans une mise en page lisible.

Les mesures détaillées dans la galerie montrent notamment les titres Collections passés de 66,24 à 77,76 px, Showroom de 63,36 à 80,64 px, Catalogue de 64,80 à 74,88 px et Journal de 67,68 à 80,64 px à 1440 × 900, conformément à la référence. Il ne s’agit pas d’une affirmation de parité pixel à pixel.

## Connexion au CMS

Les six écarts confirmés sont corrigés :

1. Le catalogue affiche ses sections, dont « Poursuivons votre découverte » et son bouton.
2. Les boutons et images des sections de l’accueil sont transmis par l’adaptateur et rendus sur ordinateur et mobile.
3. L’email commercial public apparaît lorsqu’il est renseigné, sans utiliser l’email de l’administrateur.
4. `read_article_label`, `form_name_error` et `form_email_error` contrôlent les interfaces correspondantes.
5. Les boutons des sections du Journal sont rendus ; un bouton d’article effacé ne réapparaît pas sous forme de bouton catalogue implicite.
6. Les pages intérieures utilisent les mêmes réglages de nom, ville, logos, présentation et pied de page que l’accueil.

L’audit a aussi connecté les images principales et corps enrichis des pages fixes, les titres courts et images des sections, les sections supplémentaires de l’accueil, les boutons/images des questions showroom, les légendes et précisions de disponibilité des modèles, ainsi que les crédits natifs des articles. Les sections ou photos absentes ne laissent pas de blocs vides ; les boutons incomplets sont omis. Les annotations d’édition des images pointent vers le champ réellement utilisé.

Le [modèle de contenu](content-map.md#contrat-de-rendu-complété-le-27-septembre-2026) précise les priorités des champs, les replis et le comportement des valeurs effacées. Aucun changement de schéma ou réimport du seed n’est nécessaire.

## Vérifications

- `npm run check` : 44 fichiers, aucune erreur, aucun avertissement ni remarque.
- `npm test` : 17 tests réussis.
- Validation statique du seed : 6 collections, 29 entrées, références résolues ; aucune application du seed à la base existante.
- `npm run build` : compilation réussie. L’avertissement existant sur certains bundles supérieurs à 500 Ko reste présent.
- Navigateur public, en lecture seule : 17 routes à 1440 × 900 et 390 × 844 dans les deux thèmes ; contrôles supplémentaires à 1024 × 768 et 320 × 740. Navigation mobile, persistance du thème entre pages, erreurs éditables, consentement facultatif, cinq animations principales et mouvement réduit vérifiés. Les 19 URL d’images distinctes répondent correctement ; aucune exception JavaScript, aucun débordement horizontal ni aucune tentative d’écriture.
- [Recette CMS isolée](test-results-cms.md) : connexion passkey native, brouillons non publics, aperçus signés, publication immédiate, effacement des champs, images réellement utilisées et vérifications distinctes des sections ordinateur/mobile.
- [Recette catalogue isolée](test-results-catalogue.md) : formulaire Chromium, consentements absent/false/true, contact persistant avant téléchargement, dédoublonnage, protections privées, nouveau PDF au brouillon puis publié et liens conservant les octets de leur édition d’origine. Les éditions sont distinguées par SHA-256.

Les tests qui modifient le contenu, les contacts ou l’authentification ont utilisé une copie jetable séparée sur le port 4331, avec ses propres secrets, D1, R2 et compte de test. Les garde-fous refusent le port 4321 et les environnements sans marqueur d’isolation. Le serveur jetable a été arrêté après nettoyage de ses demandes et fichiers PDF de test. La prévisualisation existante n’a pas servi de base d’intégration.

## Différences et limites conservées

Les textes, images publiées et la ville du CMS sont conservés. En particulier, la photographie de la famille Tables diffère du prototype ; son cadrage respecte désormais la composition de référence sans remplacer le média éditorial. Les six familles, cinq articles et toutes les pages restent accessibles. Le menu mobile dessert les vraies pages ; le formulaire réel conserve son consentement marketing facultatif, son information de confidentialité et sa mention de document de démonstration.

La taille de l’invitation showroom s’adapte lorsqu’un texte plus long que celui du prototype ne tient pas sous l’en-tête. Le placement de la photographie d’accueil tient compte du titre réellement publié. Ces adaptations sont documentées dans la galerie. Les contrôles ne constituent pas une garantie pour toute longueur de texte future, tous les navigateurs ou les ressources Cloudflare distantes.

Les contenus définitifs, coordonnées du showroom, droits des visuels, catalogue final et mentions légales/confidentialité restent à valider avant lancement public. Cloudflare, domaine et CRM restent hors du périmètre réalisé. Les aperçus statiques et GitHub Pages sont conservés ; `main` et le statut brouillon de la PR ne sont pas modifiés.

Ajustement demandé le 28 septembre : les commandes textuelles Clair/Sombre sont remplacées par une seule icône soleil/lune de 18 px, au bord droit des deux en-têtes. La cible tactile reste de 44 px et le libellé accessible indique l’action. Le choix du thème reste conservé entre les pages. Vérifié sur WebKit et Chromium à 1440, 390 et 320 px, avec les deux thèmes et au clavier. Cette différence avec les captures du 27 septembre est intentionnelle.

## Accès

- [Prévisualisation du site](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/)
- [Administration EmDash](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/_emdash/admin/)

Le port 4321 reste **privé**. La base, les médias, le PDF, les contacts, le compte administrateur, ses passkeys, les secrets et l’état `.wrangler/` existants sont conservés. Le serveur est géré par Astro en arrière-plan ; il dépend du fonctionnement du Codespace.
