# Fiches modèles

Les cartes « Quelques pièces à découvrir » ouvrent `/modeles/{slug}/` dans le même onglet. Le périmètre reste celui des onze modèles déjà sélectionnés dans les six familles. L'import de l'intégralité du catalogue international n'est pas réalisé.

Les URL initiales viennent de `seed/sources.json` et du champ EmDash `models.official_url`. `content/model-details.json` consigne les caractéristiques et médias des fiches françaises officielles, relevés le 28 septembre 2026. Ce fichier est une source d'import versionnée, jamais une source de secours utilisée par le frontend.

## Contenu et limites

Chaque fiche peut afficher une photo principale, une présentation française originale, l'année, la galerie du modèle exact, les dimensions métriques, les plans, les finitions regroupées par élément et matière, et le PDF technique officiel. Les photos d'autres modèles proposées par le site officiel ne sont pas importées. Les plans restent une liste indépendante : leur correspondance avec une dimension particulière n'est pas déduite de leur position.

Les textes existants des cartes restent conservés. Les caractéristiques supplémentaires sont des reformulations courtes ; le contenu commercial intégral de la marque n'est pas reproduit. Aucun prix, stock marocain, délai, disponibilité en magasin ou designer non identifié n'est ajouté. Les modèles Outdoor restent réservés aux espaces extérieurs couverts, protégés des intempéries.

Les configurateurs interactifs, vidéos et contenus sociaux restent sur le site officiel. Les différentes matières et dimensions ne signifient pas que toutes leurs combinaisons sont proposées ; le PDF technique et le showroom permettent de confirmer une configuration.

## Contrat éditorial

| Champ | Rendu |
| --- | --- |
| `title`, `description`, `image`, `image_caption`, `availability_note` | Carte de famille et fiche ; aucun média inventé si l'image est effacée |
| `release_year`, `content` | Année et corps en Portable Text |
| `gallery[].image`, `caption` | Galerie dans l'ordre éditorial ; toutes les entrées et leurs légendes sont conservées, même si une photo apparaît aussi en tête de fiche |
| `dimensions[].label`, `value`, `seats`, `large_seats` | Dimensions, places avec chaises standard et avec grandes chaises |
| `drawings[].label`, `image`, `row`, `column` | Plans et légendes, ordonnés par rangée et colonne |
| `finishes[].group`, `material_group`, `material`, `name`, `code`, `image` | Groupes dépliables, noms, références et échantillons locaux |
| `technical_sheet`, `technical_sheet_label` | PDF technique public et son libellé ; bouton absent sans fichier |
| `source_url`, `official_url` | Lien secondaire vers la source française, sinon le lien officiel antérieur |
| `source_verified_at` | Repère administratif du relevé et de l'import terminé ; n'est pas une date de publication |

Une liste ou un champ facultatif effacé disparaît du rendu. La galerie reste distincte de l'image principale : vider cette dernière ne supprime pas la galerie. Le libellé PDF vide utilise « Télécharger la fiche technique ». Les métadonnées SEO, brouillons, aperçus signés et publications sont natifs. Une fiche non publiée ne doit pas apparaître dans les sélections publiques ni dans le sitemap. Les aperçus affichent le même gabarit complet.

Les références des familles sont paginées dans leur ordre natif. Les nouvelles routes sont incluses dans le sitemap uniquement lorsque `SITE_INDEXABLE=true`, en respectant l'exclusion SEO de chaque entrée. La prévisualisation actuelle reste non indexable.

## Migration ciblée d'une base existante

Ne pas réappliquer le seed. La migration `scripts/migrations/0003-model-detail-pages.mjs` exige une véritable connexion administrateur et utilise uniquement les API natives. Elle n'inscrit pas de compte, ne crée pas de session et n'écrit pas directement dans D1.

Le parcours natif recommandé évite de copier un cookie :

```sh
npx emdash login --url http://localhost:4321
# Ouvrir le lien indiqué, se connecter à EmDash et approuver le code affiché.
EMDASH_USE_CLI_AUTH=1 node scripts/migrations/0003-model-detail-pages.mjs
EMDASH_USE_CLI_AUTH=1 node scripts/migrations/0003-model-detail-pages.mjs --apply
```

Le jeton est conservé par la CLI EmDash dans son fichier privé natif. L'importeur ne lit que l'entrée de ce projet, refuse un jeton expiré et ne renouvelle pas lui-même les identifiants. Une session de navigateur existante peut aussi être fournie dans un fichier privé, notamment pour les tests isolés :

```sh
EMDASH_AUTH_FILE=.wrangler/admin-session.json node scripts/migrations/0003-model-detail-pages.mjs
EMDASH_AUTH_FILE=.wrangler/admin-session.json node scripts/migrations/0003-model-detail-pages.mjs --apply
```

Le premier appel est une simulation. Le fichier de session doit rester privé et ignoré par Git ; ne pas copier de cookie dans une conversation ou un commit. `EMDASH_BASE_URL` désigne par défaut `http://localhost:4321` ; seuls les serveurs locaux sont acceptés. Les copies de test utilisent leur propre origine, session, secrets et stockage.

La migration ajoute dix champs facultatifs, rend la collection routable et remplit uniquement les champs encore vides. Les textes existants, images choisies, listes déjà renseignées et statuts de publication sont conservés. Les brouillons en attente ou changements de révision concurrents arrêtent l'opération. Le repère `source_verified_at` empêche une nouvelle exécution de rétablir des champs volontairement effacés après l'import.

Les téléchargements sont limités aux hôtes officiels autorisés, signatures de fichiers vérifiées, puis importés et dédupliqués dans la médiathèque native. Les octets servis sont vérifiés par SHA-256. Les sauvegardes des onze fiches et les rapports restent privés dans `.wrangler/migrations/`. Une interruption peut laisser des médias déjà importés ou des champs ajoutés : rien n'est supprimé automatiquement ; la migration peut être reprise après examen du rapport et des éventuels brouillons.

Les PDF **techniques des modèles** sont des documents publics de la marque. Le **catalogue demandé par formulaire** reste dans son stockage privé, avec ses contacts, son consentement marketing facultatif et ses liens signés inchangés.

Le seed décrit aussi ce schéma pour les bases neuves. L'enrichissement officiel passe ensuite par cette migration authentifiée ; démarrer l'application ne déclenche aucun import.
