# Vérification HTTP du catalogue

Date UTC : 2026-09-27T23:23:24.910Z

EmDash 0.41.0, D1 et R2 locaux ; session issue d’une connexion passkey native. Aucun service CRM externe contacté.

- Contacts, export et suppression protégés ; une session sans l’en-tête CSRF est refusée.
- Méthode incorrecte, origine étrangère et e-mail invalide refusés sans contact enregistré.
- Demande persistée dans D1 avant téléchargement R2 ; nouvelle tentative sans doublon ni abonnement implicite.
- Consentement facultatif : valeur omise ou false conservée sans abonnement ; choix true conservé ; réutilisation d’un UUID avec un autre choix refusée.
- Faux lien refusé ; export privé fonctionnel ; traitement CRM clairement en attente de configuration.
- PDF ajouté depuis l’API privée : le brouillon conserve l’ancienne édition ; la publication active le nouveau PDF dès la demande suivante.
- Deux PDF de contenus distincts contrôlés par SHA-256 : le brouillon et l’ancien lien livrent les octets initiaux ; les nouvelles demandes livrent les octets de la nouvelle édition après publication.
- Suppression administrative retire la demande et son événement, puis révoque le téléchargement.
- Formulaire réel Chromium : téléchargement après saisie sans consentement, puis avec consentement explicite ; les deux choix sont persistés correctement.
- Fiche Catalogue restaurée et republiée après le test.
- Contacts et PDF ajoutés par ce test supprimés de l’environnement local.
