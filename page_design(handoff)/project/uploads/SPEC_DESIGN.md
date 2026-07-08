# Mantara Voice Inbox - Specification et design produit

Date de creation : 8 juillet 2026  
Statut : premiere version de travail, decisions produit en cours  
Nom de travail : Mantara Voice Inbox

## 1. Vision

Mantara Voice Inbox est une application web responsive, utilisable sur telephone et ordinateur, qui transforme une dictee rapide en information organisee pour le suivi des projets Mantara.

L'utilisateur parle naturellement. L'application transcrit la voix, comprend le contexte, reformule la note, extrait les actions a suivre, puis propose un classement dans le bon projet.

L'objectif n'est pas seulement de remplacer une to-do list. L'objectif est de reduire la charge mentale liee a la capture, au classement et au suivi des informations de travail quand plusieurs projets, clients, sujets internes et taches s'accumulent en meme temps.

Phrase directrice :

> Transformer une pensee dictee rapidement en systeme de suivi fiable pour les projets Mantara.

## 1.1 Decisions actees

- L'Inbox de validation fait partie du MVP.
- Le classement principal se fait par projet, au sens large : client, mission, sujet interne, opportunite, chantier technique, idee ou initiative.
- Les clients ne sont pas le niveau d'organisation principal du MVP. Un client peut etre un attribut d'un projet, mais l'application ne doit pas supposer que chaque projet correspond a un client.
- Le developpement doit commencer par le backend et les API. Le backend doit etre testable seul, sans interface frontend, avant de construire l'application visuelle.
- L'authentification fait partie du MVP : connexion classique email + mot de passe, sans Magic Link. Resend pourra etre utilise pour les emails transactionnels comme verification, reinitialisation de mot de passe ou notifications systeme.
- Le MVP ne conserve pas les fichiers audio originaux. Il conserve la transcription brute et les contenus structures. La conservation audio pourra etre ajoutee plus tard si necessaire.
- Par defaut, l'IA peut auto-valider les captures lorsqu'elle est suffisamment confiante. Un reglage permettra de forcer le passage par Inbox si l'utilisateur constate trop d'erreurs.
- Le seuil d'auto-validation est strict : confiance forte, projet reconnu et note claire. Si l'un de ces criteres manque, la capture passe par l'Inbox.
- Les taches ont une priorite des le MVP : basse, normale ou haute.
- L'application doit etre pensee comme PWA-compatible, mais l'installation PWA sera finalisee apres validation du backend, du frontend et du deploiement.
- Aucune donnee Mantara existante n'est importee au depart. Les projets seront crees manuellement ou au fil de l'eau.
- Le MVP ne cree pas de table Client separee. Le champ `client_name` optionnel dans Project suffit pour commencer.
- Resend est limite au MVP aux emails d'authentification et aux emails systeme. Les notifications produit sont hors MVP.
- Le nom de travail Mantara Voice Inbox est conserve.

## 2. Probleme a resoudre

Dans le travail quotidien de Mantara, beaucoup d'informations arrivent sous forme de pensees rapides :

- une action a faire pour un client ;
- une idee a garder pour un projet ;
- un retour entendu pendant un appel ;
- une urgence a ne pas oublier ;
- une precision strategique ;
- une prochaine etape commerciale ;
- un element technique ou creatif a rattacher a un projet existant.

Le probleme n'est pas uniquement de noter ces informations. Le vrai cout mental vient de plusieurs operations successives :

- capturer l'information avant de l'oublier ;
- identifier a quel projet elle appartient ;
- reformuler ce qui a ete dit de maniere claire ;
- distinguer la note de contexte des actions concretes ;
- retrouver l'information plus tard ;
- maintenir une vue fiable de ce qui reste a faire.

Une to-do list classique oblige souvent l'utilisateur a tout organiser manuellement. Dans les moments de charge, cela cree de la friction et finit par rendre le systeme incomplet.

## 3. Utilisateur cible

Utilisateur principal :

- fondateur ou operateur de Mantara ;
- gere plusieurs clients et projets en parallele ;
- alterne entre travail commercial, strategie, creation, execution et suivi client ;
- utilise souvent son telephone pour capturer des pensees en mouvement ;
- veut aller vite, sans devoir remplir un formulaire complet a chaque idee.

Contexte d'utilisation :

- juste apres un appel client ;
- pendant un deplacement ;
- en fin de journee pour vider sa tete ;
- pendant une session de travail ou une idee surgit ;
- avant une reunion, pour preparer ou clarifier les points importants.

## 4. Principe produit

L'application repose sur quatre objets simples :

- Capture : ce que l'utilisateur vient de dicter ou saisir.
- Note : version propre, structuree et lisible de la capture.
- Tache : action concrete extraite de la capture.
- Projet : espace de classement lie a un client, une mission, une opportunite ou un sujet interne.

Le flux de base est volontairement court :

1. L'utilisateur dicte une note.
2. L'application transcrit la voix.
3. L'IA analyse la transcription.
4. L'IA propose une note mise en forme, des taches et un classement.
5. L'utilisateur valide, corrige ou deplace.
6. Les informations sont ajoutees au bon projet.

Le systeme doit etre rapide a l'entree, mais fiable a la sortie.

## 5. MVP

Le MVP doit permettre de prouver le coeur de valeur : capturer une pensee vocale et la transformer en note/taches classees.

### 5.1 Fonctionnalites incluses

#### Capture vocale

- Bouton principal pour enregistrer une note vocale.
- Etat d'enregistrement clair : en cours, pause/stop, traitement.
- Transcription automatique.
- Possibilite de relire la transcription avant validation.
- Possibilite de saisir du texte manuellement si la voix n'est pas pratique.

#### Analyse IA

A partir de la transcription, l'IA doit proposer :

- un titre court ;
- une note reformulee et structuree ;
- une ou plusieurs taches si la capture contient des actions ;
- un projet associe si le contexte est identifiable ;
- des tags utiles si necessaire ;
- une echeance si elle est explicitement mentionnee ;
- un niveau de confiance pour le classement.

#### Inbox de validation

L'Inbox sert a verifier, corriger et reprendre les captures lorsque l'IA n'est pas assez sure, ou lorsque l'utilisateur choisit un mode de validation manuelle.

Comportement par defaut :

- si la confiance IA est forte, la capture peut etre auto-validee et classee directement ;
- si la confiance IA est moyenne ou faible, la capture reste dans l'Inbox ;
- si le reglage "validation manuelle" est active, toutes les captures passent par l'Inbox.

Pour chaque element, l'utilisateur peut :

- accepter la proposition IA ;
- modifier le titre ;
- modifier la note ;
- modifier les taches ;
- changer le projet ;
- creer un nouveau projet ;
- archiver ou supprimer la capture.

Principe important : l'IA propose, l'utilisateur garde le controle.

#### Projets

L'utilisateur peut consulter une liste de projets.

Chaque projet contient :

- les notes associees ;
- les taches associees ;
- les captures d'origine si besoin ;
- un statut simple ;
- une date de derniere activite.

#### Taches

Chaque tache doit pouvoir avoir :

- un titre ;
- un statut : a faire, en cours, fait ;
- un projet rattache ;
- une note source ;
- une echeance optionnelle ;
- une priorite : basse, normale ou haute.

#### Recherche

Une recherche globale simple doit permettre de retrouver :

- une note ;
- une tache ;
- un projet ;
- un client ;
- un mot mentionne dans la transcription brute.

#### Parametres

Un ecran de reglages simple doit permettre de controler les comportements sensibles du MVP :

- activer ou desactiver l'auto-validation des captures a forte confiance ;
- forcer le passage de toutes les captures par l'Inbox ;
- definir la priorite par defaut des nouvelles taches ;
- gerer les informations de compte de base ;
- acceder aux actions d'authentification comme changement de mot de passe ou deconnexion.

### 5.2 Fonctionnalites hors MVP

Ces idees sont interessantes mais ne doivent pas bloquer la premiere version :

- apprentissage automatique avance des habitudes utilisateur ;
- rappels push natifs ;
- integration calendrier ;
- integration email ;
- collaboration multi-utilisateur ;
- permissions par equipe ;
- generation de documents longs ;
- synchronisation avec Notion, Linear, Trello ou CRM ;
- application mobile native ;
- mode offline complet ;
- analytics pousses ;
- agents autonomes qui executent les taches.

## 6. Experience utilisateur

### 6.1 Ton et posture de l'application

L'application doit se comporter comme un assistant de travail calme, pas comme un outil de productivite agressif.

Elle doit donner une sensation de clarification :

- peu de bruit visuel ;
- peu de champs obligatoires ;
- des actions rapides ;
- une interface lisible sur mobile ;
- des corrections faciles ;
- une confiance claire dans ce que l'IA a compris.

Le produit ne doit pas culpabiliser l'utilisateur avec une liste infinie de choses en retard. Il doit aider a transformer le flou en prochaines actions.

### 6.2 Navigation principale

Navigation proposee :

- Capture : bouton central ou premier ecran mobile.
- Inbox : elements IA a valider.
- Aujourd'hui : taches importantes ou dues prochainement.
- Projets : vue par projet.
- Recherche : acces rapide a tout l'historique.
- Parametres : preferences de validation IA, compte et comportement par defaut.

Sur mobile, la capture doit etre l'action la plus accessible.

Sur ordinateur, l'interface peut etre plus orientee tableau de bord :

- colonne projets ;
- liste de notes/taches ;
- panneau de detail ;
- barre de recherche.

### 6.3 Ecrans MVP

#### Ecran Capture

Objectif : capturer une pensee en moins de quelques secondes.

Elements :

- bouton micro principal ;
- zone de transcription ;
- bouton envoyer/analyser ;
- option saisie texte ;
- indication de traitement IA.

Etats :

- pret a enregistrer ;
- enregistrement en cours ;
- transcription en cours ;
- analyse en cours ;
- erreur de transcription ;
- resultat auto-valide ou pret dans l'Inbox selon le niveau de confiance et les reglages.

#### Ecran Inbox

Objectif : valider rapidement ce que l'IA a compris lorsque la capture demande une verification.

Chaque item affiche :

- titre propose ;
- projet propose ;
- extrait de note ;
- nombre de taches extraites ;
- confiance IA ;
- actions rapides : valider, modifier, deplacer, archiver.

Si la confiance est faible, l'interface doit rendre la verification plus evidente.

#### Ecran Detail de capture

Objectif : voir et corriger le resultat IA.

Sections :

- transcription brute ;
- note reformulee ;
- taches extraites ;
- projet propose ;
- tags ;
- justification courte du classement si utile.

La transcription brute doit toujours rester accessible.

#### Ecran Projet

Objectif : comprendre rapidement ce qui se passe sur un projet.

Sections :

- resume du projet ;
- taches ouvertes ;
- notes recentes ;
- captures liees ;
- historique d'activite ;
- recherche dans le projet.

#### Ecran Taches

Objectif : savoir quoi faire.

Vues possibles :

- toutes les taches ouvertes ;
- aujourd'hui ;
- cette semaine ;
- par projet ;
- terminees.

Pour le MVP, une vue simple "A faire" et une vue "Par projet" suffisent.

#### Ecran Parametres

Objectif : permettre a l'utilisateur d'ajuster le niveau de controle qu'il veut garder sur l'IA.

Options MVP :

- auto-validation des captures a forte confiance : activee par defaut ;
- validation manuelle de toutes les captures : desactivee par defaut ;
- priorite par defaut des taches : normale ;
- actions de compte : deconnexion, changement de mot de passe.

## 7. Logique IA

### 7.1 Role de l'IA

L'IA doit agir comme un assistant de tri et de structuration.

Elle ne doit pas etre consideree comme une source de verite absolue. Elle doit aider a :

- reformuler ;
- extraire ;
- classer ;
- proposer ;
- signaler l'incertitude.

### 7.2 Entrees

L'IA recoit :

- la transcription brute ;
- la liste des projets existants ;
- les noms de clients connus ;
- les notes recentes pertinentes ;
- eventuellement les tags existants ;
- les preferences utilisateur futures.

### 7.3 Sortie attendue

La sortie IA doit etre structuree, idealement en JSON, pour eviter les interpretations fragiles cote application.

Exemple de structure cible :

```json
{
  "title": "Relancer le client sur la validation du devis",
  "clean_note": "Pendant le suivi du dossier, il faut relancer le client au sujet de la validation du devis et verifier si des ajustements sont necessaires avant la prochaine etape.",
  "project_match": {
    "project_id": "project_123",
    "project_name": "Client X - Site vitrine",
    "confidence": 0.82,
    "reason": "La capture mentionne le devis et le contexte du site vitrine deja associes a ce projet."
  },
  "suggest_create_project": false,
  "tasks": [
    {
      "title": "Relancer le client pour la validation du devis",
      "due_date": null,
      "priority": "normal"
    }
  ],
  "tags": ["devis", "relance"],
  "needs_review": true
}
```

### 7.4 Regles importantes

- Ne jamais supprimer la transcription brute.
- Autoriser l'auto-validation uniquement lorsque la confiance IA est suffisante et que le reglage utilisateur le permet.
- Si le projet est incertain, mettre l'element dans l'Inbox sans classement automatique fort.
- Si un nouveau projet semble necessaire, le proposer plutot que le creer silencieusement.
- Extraire uniquement les taches vraiment actionnables.
- Ne pas inventer d'echeance si elle n'est pas mentionnee.
- Conserver un lien entre chaque tache et sa capture source.
- Conserver une trace permettant de savoir si une note a ete acceptee manuellement ou automatiquement.

### 7.5 Niveau de confiance

Le classement IA doit avoir un score ou une categorie :

- confiance forte : le projet est clairement mentionne ou tres fortement implique ;
- confiance moyenne : le contexte ressemble a un projet existant mais demande verification ;
- confiance faible : aucun rattachement fiable.

Comportement suggere :

- forte : proposer le projet en premier, validation rapide ;
- moyenne : mettre en evidence la possibilite de changer ;
- faible : laisser dans Inbox sans projet ou demander de choisir.

## 8. Modele de donnees initial

### User

Representera l'utilisateur connecte.

Champs possibles :

- id ;
- email ;
- name ;
- created_at.

Authentification MVP :

- email + mot de passe ;
- pas de Magic Link ;
- emails transactionnels via Resend ou equivalent : verification email, reinitialisation de mot de passe, alertes systeme futures.

### UserSettings

Representera les preferences de comportement de l'application.

Champs possibles :

- id ;
- user_id ;
- auto_validate_high_confidence : true par defaut ;
- manual_review_all_captures : false par defaut ;
- default_task_priority : normal ;
- created_at ;
- updated_at.

### Project

Representera l'unite principale d'organisation. Un projet peut etre lie a un client, mais peut aussi representer une mission interne, une opportunite commerciale, un chantier technique, une idee ou un sujet personnel/professionnel a suivre.

Champs possibles :

- id ;
- user_id ;
- name ;
- type : client_project, internal, opportunity, technical, personal, other ;
- client_name optionnel ;
- description ;
- status ;
- created_at ;
- updated_at ;
- last_activity_at.

Statuts possibles :

- active ;
- paused ;
- archived ;
- completed.

### Capture

Representera l'entree brute venant de la voix ou du texte.

Champs possibles :

- id ;
- user_id ;
- input_type : voice ou text ;
- raw_transcript ;
- audio_url hors MVP, optionnel futur ;
- processing_status ;
- created_at ;
- processed_at.

### Note

Representera la version propre de la capture.

Champs possibles :

- id ;
- user_id ;
- project_id optionnel ;
- capture_id ;
- title ;
- body ;
- ai_summary ;
- status : inbox, accepted, archived ;
- accepted_by : user, ai ou null ;
- confidence ;
- created_at ;
- updated_at.

### Task

Representera une action extraite ou creee manuellement.

Champs possibles :

- id ;
- user_id ;
- project_id optionnel ;
- note_id optionnel ;
- capture_id optionnel ;
- title ;
- description ;
- status : todo, doing, done ;
- priority : low, normal, high ;
- due_date optionnel ;
- created_at ;
- updated_at ;
- completed_at optionnel.

### Tag

Representera un theme ou type d'information.

Champs possibles :

- id ;
- user_id ;
- name ;
- color optionnel.

### NoteTag

Table de liaison entre notes et tags.

Champs possibles :

- note_id ;
- tag_id.

## 9. Architecture technique proposee

Hypothese de depart, a confirmer avant implementation :

- Frontend : Next.js avec App Router.
- Hebergement : Vercel.
- Base de donnees : Supabase Postgres.
- Authentification : email + mot de passe, sans Magic Link. Supabase Auth ou solution equivalente a confirmer.
- Email transactionnel : Resend pour verification, reinitialisation de mot de passe et emails systeme.
- Stockage audio : pas de conservation audio dans le MVP. L'audio peut etre traite temporairement pour transcription puis supprime.
- IA transcription : modele speech-to-text.
- IA analyse : LLM avec sortie structuree.
- UI : application web responsive, optimisee mobile.

Decision de developpement :

- Le backend et les API doivent etre construits et valides avant le frontend.
- L'application frontend doit consommer des API deja testees, plutot que definir implicitement la logique metier dans l'interface.
- Chaque flux important doit pouvoir etre teste sans interface visuelle, via requetes API, scripts de test ou collection de requetes.

### 9.1 Flux technique d'une capture vocale

1. L'utilisateur enregistre un audio dans le navigateur.
2. Le fichier audio est envoye au backend pour transcription temporaire.
3. Un service de transcription transforme l'audio en texte.
4. Le texte est sauvegarde comme Capture.
5. Le backend appelle le LLM avec la transcription et le contexte projets.
6. Le LLM retourne une structure JSON.
7. L'application cree une Note en statut accepted si l'auto-validation est autorisee et fiable, sinon en statut inbox.
8. L'application cree les taches associees, soit directement acceptees, soit en attente de validation avec la note.
9. L'utilisateur consulte, corrige ou valide selon le mode applique.

### 9.2 Points de vigilance technique

- Compatibilite micro sur mobile.
- Gestion des permissions navigateur.
- Taille des fichiers audio.
- Latence transcription + analyse.
- Robustesse des sorties JSON du LLM.
- Securite des donnees projet et client.
- Historique et audit des decisions IA.
- Cout des appels IA si l'usage augmente.

### 9.3 Strategie backend/API first

La premiere implementation doit permettre de tester le coeur du systeme sans frontend.

Objectifs :

- valider le modele de donnees ;
- valider les routes API ;
- valider la creation de captures texte ;
- valider la transcription vocale si elle est branchee a ce stade ;
- valider l'analyse IA structuree ;
- valider la creation de notes en Inbox ;
- valider l'auto-validation des captures a forte confiance ;
- valider l'extraction de taches ;
- valider le rattachement a un projet existant ;
- valider la proposition de creation de projet ;
- valider les erreurs et cas incertains.

Routes API candidates :

- `POST /api/captures/text` : creer une capture depuis du texte brut.
- `POST /api/captures/audio` : creer une capture depuis un fichier audio.
- `GET /api/captures/:id` : recuperer une capture et son statut de traitement.
- `POST /api/captures/:id/analyze` : lancer ou relancer l'analyse IA.
- `GET /api/inbox` : lister les notes en attente de validation.
- `PATCH /api/notes/:id` : modifier une note proposee.
- `POST /api/notes/:id/accept` : valider une note et ses taches.
- `POST /api/notes/:id/archive` : archiver une note.
- `GET /api/projects` : lister les projets.
- `POST /api/projects` : creer un projet.
- `PATCH /api/projects/:id` : modifier un projet.
- `GET /api/projects/:id` : consulter un projet avec notes et taches.
- `GET /api/tasks` : lister les taches.
- `PATCH /api/tasks/:id` : modifier le statut ou les champs d'une tache.
- `GET /api/search?q=...` : rechercher dans projets, notes, taches et transcriptions.
- `GET /api/settings` : recuperer les preferences utilisateur.
- `PATCH /api/settings` : modifier les preferences utilisateur, notamment l'auto-validation.

Critere de validation avant frontend :

- un scenario complet doit fonctionner via API : creer une capture, analyser, obtenir une note auto-validee ou en Inbox, modifier si besoin, valider, retrouver la note dans un projet et voir les taches associees.
- les erreurs courantes doivent etre observables : transcription impossible, JSON IA invalide, projet incertain, absence de tache, echec API externe.
- les reponses API doivent etre suffisamment stables pour servir de contrat au frontend.

## 10. Design d'interface

### 10.1 Direction visuelle

L'interface doit etre sobre, professionnelle et rapide.

Intentions :

- densite raisonnable sur desktop ;
- tres peu de friction sur mobile ;
- priorite a la lisibilite ;
- boutons d'action clairs ;
- separation nette entre ce qui est brut, propose et valide.

L'application doit ressembler a un outil de travail quotidien, pas a une landing page.

### 10.2 Hierarchie visuelle

Priorite 1 :

- bouton de capture ;
- items Inbox a valider ;
- taches ouvertes.

Priorite 2 :

- projets actifs ;
- notes recentes ;
- recherche.

Priorite 3 :

- historique ;
- tags ;
- reglages.

### 10.3 Mobile first

Le telephone est central dans l'usage.

Exigences :

- bouton micro accessible au pouce ;
- texte lisible sans zoom ;
- validation en un geste ;
- edition rapide ;
- navigation basse ou actions principales visibles ;
- aucun formulaire long pour la capture.

## 11. Regles de comportement produit

- Une capture doit toujours etre sauvegardee, meme si l'analyse IA echoue.
- Une note IA doit toujours pouvoir etre modifiee.
- Une tache doit toujours pouvoir etre detachee ou rattachee a un autre projet.
- Un projet doit pouvoir etre cree depuis l'Inbox.
- Le systeme doit differencier "note de contexte" et "action a faire".
- Une capture peut produire zero, une ou plusieurs taches.
- Une capture peut etre utile meme sans tache.
- La recherche doit inclure la transcription brute, pas seulement la note reformulee.
- L'auto-validation doit pouvoir etre desactivee depuis les reglages.
- Une note auto-validee doit rester modifiable apres coup.
- Les captures incertaines doivent aller dans l'Inbox, meme si l'auto-validation est activee.

## 12. Decisions complementaires

Ces points etaient ouverts dans la premiere version et sont maintenant arbitres :

- L'auto-validation se declenche uniquement si la confiance IA est forte, si un projet existant est reconnu, et si la note produite est claire.
- Le champ `client_name` optionnel dans Project suffit pour le MVP. Une vraie table Client pourra etre ajoutee plus tard si le besoin apparait.
- Resend sert uniquement aux emails d'authentification et aux emails systeme pendant le MVP. Les notifications produit seront etudiees apres validation du coeur applicatif.

## 13. Plan de realisation propose

### Phase 1 - Specification et cadrage

- Valider le concept.
- Valider le MVP.
- Choisir les objets de donnees.
- Choisir les ecrans prioritaires.
- Decider la stack.

### Phase 2 - Backend/API standalone

- Creer le socle backend.
- Definir le schema de donnees initial.
- Construire les routes API principales.
- Ajouter des donnees de test.
- Tester les flux sans frontend via scripts, requetes API ou collection de test.
- Valider la boucle capture texte -> analyse -> note Inbox -> taches -> projet.

### Phase 3 - IA et traitement

- Simuler d'abord l'analyse IA si necessaire pour stabiliser le contrat API.
- Brancher transcription vocale.
- Brancher analyse LLM structuree.
- Ajouter contexte projets dans le prompt.
- Gerer les erreurs et les sorties incertaines.
- Tester les cas : projet reconnu, projet incertain, nouveau projet suggere, aucune tache detectee.

### Phase 4 - Frontend

- Creer l'application web responsive.
- Construire l'ecran Capture.
- Construire l'Inbox.
- Construire les vues Projets et Taches.
- Connecter le frontend aux API deja validees.
- Tester le parcours mobile et desktop.

### Phase 5 - Persistance, auth et deploiement

- Ajouter ou finaliser la base de donnees.
- Ajouter authentification si necessaire.
- Verifier que l'audio n'est pas conserve dans le MVP, sauf traitement temporaire necessaire a la transcription.
- Deployer sur Vercel.
- Tester mobile et desktop.
- Finaliser l'installation PWA apres validation du backend, du frontend et du deploiement.
- Corriger les problemes d'ergonomie.
- Stabiliser le flux complet.

## 14. Definition de succes du MVP

Le MVP est reussi si :

- l'utilisateur peut ouvrir l'app sur telephone ;
- dicter une pensee en moins de 10 secondes ;
- obtenir une transcription exploitable ;
- recevoir une note propre et lisible ;
- obtenir les bonnes taches dans la majorite des cas simples ;
- valider ou corriger rapidement le classement ;
- retrouver l'information plus tard par projet ou recherche ;
- utiliser l'outil plusieurs jours sans que l'Inbox devienne confuse.

## 15. Synthese

Mantara Voice Inbox est une couche de capture et d'organisation intelligente au-dessus du travail quotidien de Mantara.

La valeur du produit vient de trois promesses :

- capturer sans friction ;
- transformer la parole en notes et taches utiles ;
- classer automatiquement dans le bon contexte, tout en laissant l'utilisateur garder le controle.

Le MVP doit rester simple. Il doit d'abord prouver que la boucle "dicter -> comprendre -> classer -> agir" fonctionne de maniere fluide sur telephone et ordinateur.
