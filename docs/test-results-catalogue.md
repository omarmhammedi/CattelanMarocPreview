# Vérification HTTP du catalogue

Date UTC : 2026-09-26T21:00:07.472Z

EmDash 0.41.0, D1 et R2 locaux ; session issue d’une connexion passkey native. Aucun service CRM externe contacté.

- Contacts, export et suppression protégés ; une session sans l’en-tête CSRF est refusée.
- Méthode incorrecte, origine étrangère et e-mail invalide refusés sans contact enregistré.
- Demande persistée dans D1 avant téléchargement R2 ; nouvelle tentative sans doublon ni abonnement implicite.
- Faux lien refusé ; export privé fonctionnel ; traitement CRM clairement en attente de configuration.
- PDF ajouté depuis l’API privée : le brouillon conserve l’ancienne édition ; la publication active le nouveau PDF dès la demande suivante.
- Suppression administrative retire la demande et son événement, puis révoque le téléchargement.
- Fiche Catalogue restaurée et republiée après le test.
- Contacts et PDF ajoutés par ce test supprimés de l’environnement local.
