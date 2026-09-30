# Deuxième audit SEO : décisions et contenu

Révisions 0012 et 0013, préparées le 29 septembre 2026, heure de Toronto. Les dates des noms de fichiers suivent l’horodatage UTC. Le rapport de réalisation accompagne cette note ; elle décrit les choix, pas une garantie de classement.

## Corrections retenues

L’accueil utilise désormais un seul arbre de contenu responsive : un H1, un formulaire catalogue, six familles, cinq articles et une carte. Les scènes animées de la version B restent la référence sur ordinateur ; les mêmes éléments passent dans le flux sur mobile. Les anciennes ancres mobiles restent reconnues. Les compositions sont comparées à des captures antérieures aux changements, à viewport, thème et position de défilement équivalents ; cette méthode ne justifie pas une affirmation de parité parfaite avec le prototype statique.

Les groupes de finitions étaient déjà repliés et leurs images différées. Une mesure réelle de Greta a confirmé zéro échantillon téléchargé avant ouverture, malgré 383 éléments `img` dans le document. Le problème restant était le poids des originaux après ouverture d’un groupe. Les vignettes utilisent maintenant le service WebP natif existant, avec des tailles adaptées et un lien vers chaque original. Aucun média du CMS n’est remplacé. Les mesures et leur coût HTML figurent dans [le relevé des nuanciers](audits/seo-swatches-2026-09-29.json).

Le pays est normalisé de « Maroc » à `MA` dans le balisage du magasin. Les profils sociaux configurés dans les réglages natifs EmDash alimentent `sameAs` lorsqu’ils contiennent des URL web explicites ; les effacer retire ces valeurs. Aucun compte Instagram ni fiche Google supposée n’est ajouté. Le lien d’itinéraire reste dans `hasMap`.

Le [manifeste 0012](../content/seo-followup-2026-09-30.json) cible quatre entrées existantes :

- Accueil : présentation du showroom sans mention d’une collection chambre absente, avec livraison au Maroc.
- Showroom : adresse dans l’introduction, texte utile sur les compositions, cinq liens vers les familles, livraison nationale et contact WhatsApp.
- Tables : introduction consacrée aux formes, à l’encombrement et aux places, sans répéter le paragraphe sur les matières.
- Réglages communs : WhatsApp au numéro fourni et libellé « Contacter le showroom ». Les liens WhatsApp affichent leur destination ; les liens vers les coordonnées conservent un libellé approprié.

Le contenu reste natif dans EmDash. Le manifeste n’est ni un seed ni une source de remplacement côté frontend. La migration protège les valeurs de départ exactes, les révisions, brouillons, schémas, relations et champs non ciblés. Un champ WhatsApp absent est distingué d’un champ effacé ou modifié. Les sauvegardes restent privées dans `.wrangler/`.

La [révision 0013](../content/gallery-alt-2026-09-30.json) décrit les 129 photographies des onze modèles après inspection des visuels existants. Elle reprend aussi ces descriptions sur les onze images principales identiques. Seuls les textes alternatifs changent : fichiers, cadrages, légendes et références restent conservés. Une description personnalisée ou un brouillon interrompt la migration sans être écrasé.

## Points de l’audit à nuancer

- **Dimanche fermé :** `opens: "00:00"` et `closes: "00:00"` indiquent précisément une fermeture toute la journée selon [Google Local Business](https://developers.google.com/search/docs/appearance/structured-data/local-business). Ce balisage est conservé.
- **Longueur des articles :** Google ne fixe pas de minimum de mots. Les cinq articles restent centrés sur leurs réponses utiles, sans ajout destiné seulement à atteindre 800–1 200 mots. Voir les [recommandations de contenu utile](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).
- **Ville dans chaque H1 :** les titres SEO des collections et la page showroom portent déjà Casablanca. La ville n’est pas ajoutée systématiquement à chaque titre visible, bouton et paragraphe.
- **Texte commun de contact :** sa présence une fois par famille répond aux questions de prix et de disponibilité. Il n’est pas remplacé par six synonymes ou par des affirmations non vérifiées sur le stock.
- **Product :** le balisage décrit les modèles. Sans offre, note ou avis, il ne garantit pas l’éligibilité à un [résultat produit enrichi Google](https://developers.google.com/search/docs/appearance/structured-data/product-snippet).
- **`priceRange` :** aucune fourchette ni symbole monétaire arbitraire n’est publié. Le code pays suit la convention ISO indiquée dans les [données d’organisation Google](https://developers.google.com/search/docs/appearance/structured-data/organization).

## Informations confirmées par le propriétaire

La livraison couvre le Maroc ; Casablanca, Rabat, Marrakech et Tanger sont les marchés prioritaires. Ces villes apparaissent dans un seul passage utile sur la livraison, sans pages locales artificielles. Le numéro WhatsApp Business public est **+212 771 105 490**. Le lien ouvre WhatsApp ; il ne connecte pas de CRM et n’envoie aucun message automatiquement.

Le lancement doit présenter une sélection stratégique et les produits réellement exposés. La liste de ces références n’a pas été fournie : les onze modèles existants restent des sélections, sans badge de stock ou d’exposition inventé. Aucun accompagnement d’architectes, service de pose, stationnement ou condition de rendez-vous n’est ajouté sans confirmation.

Le nouveau logo revendeur monomarque et l’autorisation écrite d’utilisation de la marque et des contenus restent attendus. L’accord sur le site et le transfert de domaine est confirmé, mais cette révision ne raccorde aucun domaine. La garantie et le SAV sont à confirmer. La phrase transmise sur l’absence de retour/remboursement n’est pas convertie en politique de vente définitive sans vérification des conditions applicables.

## Lancement à finaliser

Le vrai PDF, les autorisations, les informations légales et de confidentialité, le domaine définitif et les profils locaux restent à finaliser. Le PDF de démonstration, ses avertissements et le consentement marketing facultatif séparé sont conservés. L’indexation reste désactivée. Il n’y a ni nouvelle souscription payante, ni CRM, ni fournisseur email ajouté.

Les articles peuvent ensuite couvrir des projets marocains documentés et des questions réelles des clients. Il ne faut pas inventer de réalisations, de témoignages, de délais ou de particularités locales pour alimenter un calendrier.
