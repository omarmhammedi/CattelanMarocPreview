# Contenus publiés dans l’aperçu principal

Captures du **28 septembre 2026, entre 18 h 15 et 18 h 25, heure de Toronto (HAE)**, après publication native des migrations 0003 et 0004 dans EmDash. Les pages proviennent de la base existante du projet, servie sur `http://localhost:4321`, accessible par [l’aperçu privé](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/).

Les huit images sont une sélection des 28 captures Chromium générées par `tests/published-content-browser.mjs`. Les mesures indiquées sont les dimensions du viewport en pixels CSS. Le mouvement réduit est activé pour stabiliser ces captures ; elles ne représentent pas un enregistrement des animations ni un test sur un iPhone physique.

La vue « Tables — texte mobile » a été reprise à 18 h 25 en attendant explicitement le décodage du logo ; son premier rendu avait été capturé avant la fin du chargement de cette image. La page et son contenu n’ont pas été modifiés pour cette reprise.

| Capture | Page et contenu | Viewport | Thème |
| --- | --- | --- | --- |
| [Tables — texte](tables-1440-dark-content.jpg) | `/collections/tables/` — comparaison du verre et de la céramique, formats et nombre de places | 1440 × 900 | Sombre |
| [Tables — texte mobile](tables-390-light-content.jpg) | `/collections/tables/` — lecture des paragraphes et liens vers les modèles | 390 × 844 | Clair |
| [Skorpio — présentation](skorpio-1440-dark-hero.jpg) | `/modeles/skorpio/` — introduction et photographie officielle | 1440 × 900 | Sombre |
| [Skorpio — présentation mobile](skorpio-390-light-hero.jpg) | `/modeles/skorpio/` — introduction, année et contact | 390 × 844 | Clair |
| [Skorpio — détails](skorpio-390-light-content.jpg) | `/modeles/skorpio/` — épaisseur du verre et finitions du piètement | 390 × 844 | Clair |
| [Skorpio — finitions](skorpio-1440-light-finishes.jpg) | `/modeles/skorpio/` — groupe de finitions ouvert au clavier | 1440 × 900 | Clair |
| [Rhonda — présentation](rhonda-1440-light-hero.jpg) | `/modeles/rhonda/` — description et photographie officielle | 1440 × 900 | Clair |
| [Napoleon Keramik Outdoor](napoleon-keramik-outdoor-390-dark-hero.jpg) | `/modeles/napoleon-keramik-outdoor/` — titre long et condition d’utilisation sous abri | 390 × 844 | Sombre |

Le script consulte exclusivement les pages et médias publics, sans session d’administration et avec blocage de toute méthode autre que GET/HEAD. Les fichiers complets de contrôle restent sous `test-results/publication-final/` ; cette sélection sert à examiner le rendu publié, sans affirmer une correspondance au pixel près avec le prototype B.
