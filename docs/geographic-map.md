# Carte géographique du showroom

La carte de l’accueil utilise la géographie réelle de Casablanca et le langage visuel de la version B : couleurs des thèmes clair/sombre, routes fines, typographie et repère rouge animé. Le littoral et les rues proviennent d’OpenStreetMap ; le repère du magasin provient des coordonnées de l’établissement fourni par le propriétaire. Ces deux sources restent distinctes.

Les résultats des contrôles de navigateur, du CMS et de publication sont consignés séparément dans [le rapport de validation](test-results-geographic-map.md).

## Source et périmètre

Le fichier [src/data/casablanca-map.json](../src/data/casablanca-map.json) contient un extrait d’OpenStreetMap obtenu par deux requêtes bornées à l’API Overpass, la seconde élargissant la couverture nécessaire au déplacement de la carte. L’instant de référence de l’extrait final est le **28 septembre 2026 à 21 h 18 min 02 s, heure de Toronto**. La valeur technique fournie par Overpass est `2026-09-29T01:18:02Z`.

| Élément | Contenu |
| --- | --- |
| Coordonnées | Longitude, latitude en WGS84 ; nord en haut |
| Limites de navigation | Ouest −7,72 ; sud 33,555 ; est −7,575 ; nord 33,635 |
| Étendue au sol | Environ 13,4 km d’est en ouest et 8,9 km du nord au sud |
| Littoral | Cinq chemins OSM réunis dans leur ordre géographique ; côte et port réels |
| Routes | 3 128 chemins OSM réunis en 1 346 tracés ; 5 979 sommets conservés |
| Quartiers et lieux | 62 points nommés provenant d’OSM ; une sélection est affichée |
| Fichier source | 301 375 octets ; 78 730 octets après compression gzip locale |

Les routes principales de classes OSM `trunk`, `primary`, `secondary` et `tertiary` couvrent toute l’étendue. Les rues résidentielles, voies non classées et passages piétons sont limités aux tracés qui rencontrent un rayon de 1,5 km autour du showroom. Cette sélection conserve des détails utiles à proximité et une lecture plus légère à l’échelle de la ville. Les voies peuvent se prolonger au-delà de la limite de sélection lorsqu’elles constituent un même tracé continu ; la navigation reste bornée à l’extrait.

Les chemins d’une même classe et portant le même nom ne sont réunis qu’aux extrémités ayant exactement deux connexions dans ce groupe. Chaque tracé conserve ses identifiants de chemins OSM. Le nom français est préféré lorsqu’il existe, puis `name:latin`, puis le nom principal d’OSM.

La simplification Douglas–Peucker utilise une tolérance de **3 mètres dans la projection Web Mercator**. Elle conserve des sommets d’origine ; elle ne dessine pas de rues supplémentaires. La distance mesurée dans cette projection n’est pas une mesure topographique au sol. L’extrait sert à situer le showroom et à explorer les environs ; il ne calcule aucun trajet.

Les cinq chemins du littoral sont assemblés par leurs identifiants de nœuds, sans inverser leur orientation : terre à gauche, mer à droite. Pour cet extrait de Casablanca, la chaîne commence à l’est et finit à l’ouest, hors des limites de navigation. Les segments nécessaires à la fermeture du polygone marin sont ajoutés entièrement hors de ces limites, puis le polygone est découpé à la frontière de l’extrait. Aucun segment artificiel ne traverse l’intérieur de la carte pour remplacer la côte. Le générateur refuse une côte déconnectée ou une orientation incompatible avec cette construction.

## Rendu et repère du magasin

[GeographicMapSymbols.astro](../src/components/GeographicMapSymbols.astro) prépare des tracés SVG partagés, regroupés par classe de route. [GeographicMap.astro](../src/components/GeographicMap.astro) les utilise pour les compositions ordinateur et mobile. Les deux affichages partagent le même extrait et la même projection Web Mercator, calculée dans [geography.ts](../src/lib/geography.ts). Les libellés de rues suivent le milieu et la direction d’un segment réel.

Le fond cartographique, les rues et les quartiers sont servis avec le site. Zoom, recentrage et déplacement agissent sur le SVG local ; la carte reste visible sans JavaScript. L’attribution accompagne chaque affichage. Aucune tuile, géométrie de rue ou géométrie de côte n’est copiée de Google Maps.

### Commandes et noms de rues

Les boutons `+` et `−` modifient l’échelle par étapes de facteur 1,25. Le cadrage initial correspond à un zoom relatif de 1 ; le rapprochement maximal est de 16. Le dézoom minimal est calculé à partir des limites de l’extrait et des proportions de l’affichage : il permet le cadrage le plus large qui reste dans les données disponibles. Le bouton `−` est donc utilisable dès le départ lorsque le cadrage initial est plus serré que cette limite. Le recentrage rétablit le cadrage initial.

La position des commandes suit la partie visible de la carte pendant le défilement de la page. Elles restent sous l’en-tête fixe et dans les limites de la carte, au-dessus de l’attribution. Le glissement à la souris ou au toucher exige d’activer son bouton de déplacement.

Sur ordinateur, le trackpad agit directement sur la carte sous le pointeur : le déplacement à deux doigts parcourt les rues horizontalement et verticalement ; le pincement règle le zoom autour du pointeur. La molette d’une souris déplace également la carte, et Ctrl + molette règle son zoom. Hors du fond cartographique, le défilement reste celui de la page. Lorsque le déplacement atteint la limite de l’extrait et ne peut plus avancer, il laisse la page défiler. Les gestes sur écran tactile conservent le défilement et le zoom natifs du navigateur.

Le contrôleur traite les événements [wheel](https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event), dont la variante Ctrl émise par le pincement de certains trackpads, et les [GestureEvents Safari](https://developer.apple.com/documentation/webkitjs/gestureevent). Il évite de compter deux fois un geste émis par les deux mécanismes. Le changement de caméra conserve la position de la page ; les limites de zoom et de couverture restent communes aux boutons, au clavier et aux gestes.

Le jeu existant contient **1 113 segments nommés, pour 605 noms distincts**. [map-labels.ts](../src/lib/map-labels.ts) prépare leurs positions et directions à partir des tracés réels. Les longs axes et la rue du showroom disposent aussi de positions alternatives sur leur propre tracé, pour conserver un nom visible lorsque son milieu est masqué ou hors cadre. Ces alternatives tiennent compte de la longueur disponible de chaque côté du point retenu. La page inclut une seule copie des **1 223 candidats** dans la métadonnée SVG `casablanca-label-data` : 121 198 octets de JSON, sans duplication de l’extrait géographique complet dans le code client. Les noms et le jeu de données OSM restent inchangés ; aucun libellé de rue n’est inventé pour remplir la carte.

Avec JavaScript, les libellés sont choisis pour le cadrage réellement visible. Le sélecteur mesure leur largeur à une taille de 13 px et compare la longueur du segment à l’espace disponible à l’écran. Un léger débordement du texte aux intersections est autorisé, car les segments OSM y sont souvent interrompus même lorsque la rue continue. Un nom peut apparaître dès le cadrage initial si l’espace est suffisant ; les petites rues deviennent admissibles en se rapprochant. Cette décision utilise l’échelle en pixels plutôt qu’un seuil de zoom commun à l’ordinateur et au mobile.

La rue du showroom est prioritaire, puis les grands axes selon leur classe, puis les candidats les plus proches du centre. Les boîtes de texte tiennent compte de leur rotation, des bords de la carte, des commandes, du repère, du panneau d’information, de l’attribution et des noms de quartiers. Une même rue n’est nommée qu’une fois par affichage. Le sélecteur conserve au maximum 15 noms dans une carte de moins de 700 px de large, sinon 30 ; il peut en retenir moins pour éviter des chevauchements. Les 605 noms ne sont donc pas affichés simultanément. Déplacer ou agrandir la carte permet d’en révéler d’autres.

Sans JavaScript, les huit libellés de grands axes déjà présents servent de repli, avec le fond géographique, le repère valide et l’itinéraire ; les commandes interactives sont masquées. Ces ajustements de commandes et de libellés ne changent ni les coordonnées ni les champs EmDash.

Les champs facultatifs EmDash `showroom_latitude` et `showroom_longitude` déterminent le repère. La cible initiale est **33,5927007 ; −7,6426741**, issue du repère de l’établissement dans la carte Google Maps fournie, et non du centre de son iframe. Cette provenance est enregistrée séparément dans [content/showroom-geography.json](../content/showroom-geography.json). Le frontend lit les valeurs publiées dans EmDash. Une coordonnée absente, invalide ou hors de la couverture masque le repère plutôt que de le déplacer vers une position inventée. Modifier ces champs ne déplace ni le littoral ni les rues.

OSM nomme la rue **« Avenue du Docteur Mohamed Sijelmassi »**. L’adresse fournie par le propriétaire utilise **« Avenue Mohamed Sijilmassi »**. Le libellé cartographique conserve le nom de sa source ; cette différence ne remplace pas l’adresse éditoriale du showroom dans EmDash.

L’itinéraire externe reste celui du champ `map_url`. La carte Google Maps facultative déjà présente sur la page showroom conserve son chargement à la demande. Elle est indépendante de la carte géographique de l’accueil.

## Licence et attribution

Les données OpenStreetMap sont distribuées sous [Open Database License 1.0 — ODbL](https://opendatacommons.org/licenses/odbl/1-0/). L’extrait dérivé conserve cette licence. La carte affiche **« © OpenStreetMap contributors »**, avec un lien vers [la page d’attribution et de licence d’OpenStreetMap](https://www.openstreetmap.org/copyright).

Le lien **« Données ODbL »** permet de télécharger l’extrait effectivement utilisé à l’adresse `/cartographie/casablanca.json`. Le fichier inclut ses sources, sa licence, les limites géographiques, la requête de récupération, les critères de sélection et les identifiants des objets OSM. Conserver ce téléchargement et l’attribution lors d’une reprise de cette carte.

Cette licence concerne les données géographiques OSM. La présence d’un nom d’établissement ou du repère fourni par le propriétaire ne signifie pas qu’OpenStreetMap a vérifié ces informations commerciales.

## Régénérer l’extrait

Le générateur [scripts/generate-casablanca-map.mjs](../scripts/generate-casablanca-map.mjs) fonctionne avec Node 24 et ne nécessite aucune dépendance cartographique supplémentaire. Il ne lit et ne modifie pas la base EmDash, les médias, les comptes ou les secrets.

Pour récupérer un nouvel extrait :

```sh
node scripts/generate-casablanca-map.mjs
```

Pour demander l’état historique utilisé ici :

```sh
node scripts/generate-casablanca-map.mjs --date 2026-09-29T01:18:02Z
```

Pour régénérer depuis une réponse JSON Overpass déjà sauvegardée, sans requête réseau :

```sh
node scripts/generate-casablanca-map.mjs --input /tmp/overpass-casablanca.json
```

Le fichier fourni à `--input` doit être une réponse complète correspondant aux limites et sélections de la requête du générateur. Pour un extrait historique, conserver également le même argument `--date` afin d’enregistrer la requête correspondante. L’heure de génération `fetchedAt` varie à chaque exécution ; une nouvelle requête actuelle peut naturellement produire des données différentes. L’horodatage `osmTimestamp` est celui de la base indiqué par Overpass : lors d’une requête historique, la date demandée figure dans la requête enregistrée.

L’option `--output /tmp/casablanca-map.json` permet de vérifier un résultat avant de remplacer le fichier du dépôt. Après un changement d’extrait, contrôler le littoral, les limites, le repère, les libellés et le rendu dans les deux thèmes, puis mettre à jour les tailles et l’instant de référence de ce document.

Le générateur effectue une requête bornée à l’exécution. En cas de refus ou d’indisponibilité d’Overpass, il échoue ; il n’enchaîne pas de tentatives automatiques. Ne pas le brancher sur les visites, le défilement ou un rafraîchissement périodique du navigateur. La carte affichée ne dépend d’aucun service cartographique distant et n’ouvre aucun nouveau compte, abonnement ou service facturé. Les coûts habituels de l’hébergement du site restent distincts.

## Vérification des données et références

Les contrôles effectués sur cet extrait ont confirmé la régénération déterministe depuis la réponse locale, l’absence de doublons d’identifiants de chemins, la conservation de sommets OSM d’origine, la fermeture du polygone marin dans les limites prévues et le refus d’un littoral incomplet. Le showroom et le point OSM du Maârif sont du côté terrestre ; les points de contrôle dans l’Atlantique et le bassin du port sont du côté marin. Ces contrôles géométriques ne remplacent pas les essais du frontend consignés dans le rapport séparé.

Références consultées :

- [OpenStreetMap — Copyright and License](https://www.openstreetmap.org/copyright) : licence des données et attribution.
- [Overpass API User’s Manual — Commons](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html) : usage mesuré du service public et distinction entre requêtes ponctuelles et service de fond d’une application.
- [OpenStreetMap Wiki — natural=coastline](https://wiki.openstreetmap.org/wiki/Tag:natural%3Dcoastline) : orientation de la côte, mer à droite et terre à gauche.
