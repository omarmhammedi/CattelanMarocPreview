# Fiches modèles — vérification du 28 septembre 2026

Date exprimée à Toronto. Environnement : copie jetable `/tmp/cattelan-models-integration-NXr8ZO`, origine locale `http://localhost:4331`, dépendances, secrets, D1, R2 et passkey de test propres à cette copie. Aucune inscription ni manipulation de passkey n'a été réalisée sur la base principale.

## Résultats

- Les six familles donnent accès aux onze fiches par des liens internes, dans le même onglet.
- Les onze fiches affichent les valeurs EmDash : titre, image, corps, galerie, dimensions, dessins, finitions et document technique.
- 609 URL de médias distinctes ont été téléchargées, contrôlées par signature de fichier, puis importées par l'API native. Les octets servis sont vérifiés par SHA-256. L'ensemble comprend 129 entrées de galerie, 63 dimensions, 72 dessins, 1 174 références de finitions et onze PDF. Les références répétées partagent leurs médias.
- Chromium : les onze fiches à 1440 × 900 et 390 × 844, en clair et sombre ; aucune erreur JavaScript ni largeur débordante. Galerie, finitions, thèmes et navigation sont utilisés au clavier. Menu mobile et passage famille → modèle restent dans le même onglet.
- WebKit : Skorpio, Rhonda et Napoleon Keramik Outdoor dans les mêmes quatre configurations. Ces cas couvrent le titre long, la table en verre, les dessins et les nombreuses finitions d'une assise. Les galeries, accordéons, thèmes et menus fonctionnent.
- Mouvement réduit vérifié dans les deux moteurs. Les contenus restent visibles et les transitions sont désactivées.
- Le téléchargement depuis le navigateur correspond au SHA-256 du PDF technique servi ; les onze documents répondent en `application/pdf` avec des octets PDF valides.
- Le brouillon d'un modèle ne modifie ni sa page publique ni les cartes des familles. Son aperçu signé utilise le gabarit complet ; un faux jeton ne révèle pas ses modifications.
- Publier rend les modifications immédiatement visibles. Effacer les champs facultatifs les retire, sans restauration de contenu depuis un JSON. Dépublier donne une 404 publique et retire les liens de sélection, tout en conservant l'aperçu signé. La fiche initiale est ensuite restaurée et republiée.
- Une deuxième exécution de la migration avec `--apply` ne modifie rien : zéro champ, zéro modèle et zéro média à importer. Les tests unitaires vérifient aussi la conservation de champs volontairement effacés après l'import.
- La connexion native OAuth par code d'appareil a été exercée uniquement dans la copie jetable, avec son administrateur fictif. L'import avec le jeton CLI natif fonctionne ; aucune copie de cookie dans une conversation n'est nécessaire.
- Le parcours catalogue/contact/PDF existant a été rejoué dans cette copie : persistance avant téléchargement, dédoublonnage, consentement omis/false/true, stockage privé, changement d'édition au brouillon puis publié, anciens liens et suppression. Les contacts et PDF ajoutés par ce test ont été supprimés, et le catalogue initial restauré.
- `npm test` : 29 tests réussis. Validation du seed réussie : six collections, 29 entrées. `npm run check` : 57 fichiers, zéro diagnostic. `npm run build` réussit ; l'avertissement existant concernant des bundles supérieurs à 500 Ko demeure.
- Prévisualisation principale : huit cas de navigation encadrée réussis en lecture seule, dont collections → Skorpio dans le même onglet. Les protections d'encadrement de l'administration et des aperçus CMS restent actives. La visibilité privée du port 4321 est confirmée.

## Captures et limites

La [galerie de captures](screenshots/models-2026-09-28/README.md) provient de l'environnement isolé. Le cadrage conserve la totalité de la photographie officielle. Les titres des accordéons restent sous l'en-tête fixe lorsqu'ils sont ciblés au clavier ou par défilement.

Le premier passage combinant tous les navigateurs a été interrompu lorsque le serveur de développement ne répondait plus. Après relance, les contrôles de publication et WebKit ont été exécutés séparément et réussis. Le contrôle d'un échantillon chargé à la demande défile désormais jusqu'à l'image avant d'attendre son décodage ; les délais réseau et navigateur sont bornés. Les captures Chromium validées sont conservées.

Ces résultats ne constituent pas un essai sur iPhone physique ni sur Workers en production. Les configurateurs et vidéos du site international ne sont pas reproduits. Les documents techniques publics restent distincts du catalogue privé remis après formulaire. L'import dans la base principale exige sa propre connexion administrateur ; les identifiants de test ne peuvent pas l'autoriser.
