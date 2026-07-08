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

### 7.6 Seuils de confiance et regle d'auto-validation (deterministe)

Pour que le backend puisse decider sans ambiguite, on fixe des seuils numeriques sur le champ `confidence` (0 a 1) retourne par le LLM dans `project_match.confidence`.

| Categorie | Plage | Comportement |
| --- | --- | --- |
| Forte | `>= 0.80` | Eligible a l'auto-validation (voir regle ci-dessous). Projet propose en premier. |
| Moyenne | `0.50` a `< 0.80` | Toujours Inbox. Projet propose mais mis en evidence comme modifiable. |
| Faible | `< 0.50` | Toujours Inbox, sans projet fort. Demander a l'utilisateur de choisir. |

Regle d'auto-validation (calculee cote backend, pas par le LLM). Une capture est auto-validee — Note creee directement en statut `accepted`, `accepted_by = ai` — si et seulement si TOUTES ces conditions sont vraies :

1. `settings.auto_validate_high_confidence == true` ;
2. `settings.manual_review_all_captures == false` ;
3. `project_match.confidence >= 0.80` ;
4. `project_match.project_id` correspond a un projet existant de l'utilisateur (non nul) ;
5. `suggest_create_project == false` ;
6. `needs_review == false` (drapeau d'incertitude du LLM) ;
7. `title` non vide et `clean_note` non vide.

Si une seule condition manque, la Note est creee en statut `inbox` (`accepted_by = null`) et attend une validation manuelle. Les taches extraites suivent le meme sort que leur note (acceptees avec elle, ou en attente dans l'Inbox).

Note : le champ `needs_review` du LLM est un signal, pas la decision finale. La decision d'auto-validation est toujours recalculee par le backend avec la regle ci-dessus, meme si le LLM a renvoye une confiance elevee.

## 8. Modele de donnees initial

### User

Representera l'utilisateur connecte.

Champs possibles :

- id ;
- email ;
- name ;
- created_at.

Authentification MVP :

- email + mot de passe, via Auth.js (NextAuth) ; mot de passe hache (bcrypt) stocke en base ;
- pas de Magic Link ;
- emails transactionnels via Resend : verification email, reinitialisation de mot de passe, alertes systeme futures.

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

Topologie d'hebergement (decision actee) : seul le frontend est heberge sur Vercel. Tout le reste — API backend, base de donnees, transcription et appels LLM — tourne sur une machine Mantara sous Windows (qui heberge deja d'autres projets), exposee via un tunnel Cloudflare. Le frontend Vercel appelle le backend a travers l'URL publique du tunnel. Il n'y a aucune dependance cloud pour la base ou l'auth.

Stack retenue :

- Frontend : Next.js avec App Router, deploye sur Vercel.
- Backend : API (Route Handlers Next.js ou service Node dedie) hebergee sur la machine Mantara, derriere le tunnel Cloudflare.
- Base de donnees : PostgreSQL auto-heberge sur la machine Mantara.
- Authentification : email + mot de passe, sans Magic Link, via Auth.js (NextAuth) ; mots de passe haches (bcrypt), sessions applicatives. Pas de service d'auth tiers.
- Email transactionnel : Resend pour verification, reinitialisation de mot de passe et emails systeme.
- Stockage audio : pas de conservation audio dans le MVP. L'audio est traite temporairement pour transcription puis supprime.
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

### 9.4 Decisions de stack pour le MVP (defauts a utiliser)

Les hypotheses de la section 9 sont ici verrouillees en defauts concrets pour que les agents ne soient pas bloques. Ces choix restent remplacables, mais un agent doit les adopter par defaut sauf indication contraire de l'utilisateur.

- Langage : TypeScript partout.
- Framework : Next.js (App Router). Le backend vit dans les Route Handlers `app/api/**` du meme projet ; le frontend consomme ces routes.
- Gestionnaire de paquets : pnpm (npm accepte en repli).
- Base de donnees : PostgreSQL auto-heberge sur la machine Mantara. Schema gere par migrations SQL versionnees dans le repo. Acces via un client typed (Drizzle ou Prisma recommande, `pg` accepte).
- Acces base : uniquement cote serveur backend (jamais depuis le frontend). Chaque requete est scopee a l'utilisateur connecte par un filtre `user_id` au niveau applicatif. Des policies RLS Postgres peuvent etre ajoutees en complement mais ne remplacent pas le filtrage applicatif.
- Authentification : Auth.js (NextAuth), email + mot de passe, sans Magic Link. Mots de passe haches (bcrypt), sessions verifiees cote serveur dans chaque route protegee. Aucun service d'auth tiers.
- Transcription (STT) : Whisper local, modele `medium` pour le MVP. Derriere une interface `transcribe(audio: Blob): Promise<string>` pour rester remplacable (autre taille de modele, ou service distant) sans toucher au reste du code. Implementation locale via `faster-whisper` ou `whisper.cpp`. La taille du modele est pilotee par la variable `WHISPER_MODEL` (defaut `medium`).
- Analyse LLM : API Anthropic (Claude). Modele par defaut `claude-haiku-4-5-20251001` (Haiku 4.5). Le modele DOIT etre pilote par une variable d'environnement `ANTHROPIC_MODEL` afin d'en changer sans modifier le code (ex. basculer vers `claude-sonnet-5` ou `claude-opus-4-8` si besoin de qualite). Sortie structuree JSON via tool use / schema, derriere une interface `analyzeCapture(input): Promise<AnalysisResult>` conforme au JSON de la section 7.3.
- Email transactionnel : Resend (verification e-mail, reinitialisation mot de passe, alertes systeme uniquement).
- Hebergement : frontend sur Vercel ; backend + PostgreSQL + transcription + appels LLM sur la machine Mantara (Windows), exposes via tunnel Cloudflare. Audio non conserve (traitement temporaire pour transcription puis suppression).
- UI : Next.js + React, responsive mobile-first, en respectant strictement la section 10.4.

Variables d'environnement attendues (a placer dans `.env.local`, jamais commitees) :

Backend (machine Mantara) :

```
# Base de donnees (Postgres local)
DATABASE_URL=postgres://user:pass@localhost:5432/mantara_voice_inbox

# Auth.js
AUTH_SECRET=            # secret de signature des sessions
AUTH_URL=https://api.mantara-voice.fr       # URL publique du backend (tunnel Cloudflare)
COOKIE_DOMAIN=.mantara-voice.fr             # cookie de session partage entre sous-domaines
CORS_ALLOWED_ORIGIN=https://app.mantara-voice.fr

# IA
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-haiku-4-5-20251001   # modele LLM, changeable sans toucher au code
WHISPER_MODEL=medium                        # taille du modele Whisper local (tiny|base|small|medium|large)

# Email
RESEND_API_KEY=
```

Frontend (Vercel) :

```
# URL publique du backend (tunnel Cloudflare)
NEXT_PUBLIC_API_BASE_URL=https://api.mantara-voice.fr
```

Structure de projet suggeree (indicative, adaptable) :

```
app/                     # routes Next.js (pages + api)
  api/                   # Route Handlers = le backend testable seul
  (screens)/             # ecrans frontend (voir 10.4)
lib/
  ai/                    # interfaces transcribe() et analyzeCapture()
  db/                    # client Postgres (Drizzle/Prisma) + requetes
  auth/                  # helpers session
db/
  migrations/            # migrations SQL
tests/                   # scripts de test API (voir 9.3)
```

Nom de domaine : `mantara-voice.fr`. Mapping des sous-domaines (decision actee) :

- `app.mantara-voice.fr` : frontend, sur Vercel (domaine custom pointant vers Vercel).
- `api.mantara-voice.fr` : backend + API, via le tunnel Cloudflare vers la machine Mantara.

Ces deux sous-domaines partagent le meme domaine parent, ils sont donc consideres **same-site** : le cookie de session n'est pas un cookie tiers et n'est pas bloque par les navigateurs.

Consequences de la topologie (front Vercel / back machine Mantara via tunnel Cloudflare) :

- Le backend etant sur une machine persistante (et non serverless), Whisper local `medium` et PostgreSQL y tournent sans contrainte de cold start ni de taille de modele. C'est ce qui rend ce choix viable.
- Le frontend n'accede jamais directement a la base : il appelle uniquement l'API backend via `NEXT_PUBLIC_API_BASE_URL` (`https://api.mantara-voice.fr`).
- Session (decision actee) : cookie de session Auth.js `HttpOnly`, `Secure`, `SameSite=Lax`, `Domain=.mantara-voice.fr`. Pas de jeton Bearer ni de stockage de token cote client (plus sur : inaccessible au JS, donc non vulnerable au vol par XSS). Le front appelle l'API avec `credentials: 'include'`.
- CORS : le backend autorise l'origine `https://app.mantara-voice.fr` (et `http://localhost:3000` en dev) avec `Access-Control-Allow-Credentials: true`. Protection CSRF assuree par Auth.js.
- Le tunnel Cloudflare doit rester ouvert pour que l'app fonctionne ; prevoir sa persistance au demarrage de la machine Windows.

### 9.5 Conventions d'API (contrat frontend)

Regles communes a toutes les routes `app/api/**` :

- Format : JSON en entree et en sortie. Encodage UTF-8. Dates en ISO 8601 UTC. Identifiants en UUID.
- Authentification : session Auth.js portee par un cookie `HttpOnly` `Secure` `SameSite=Lax` `Domain=.mantara-voice.fr` (voir 9.4). Toutes les routes sauf inscription/connexion exigent une session valide. Une route renvoie `401` sans session, `403` si la ressource appartient a un autre utilisateur. Chaque requete filtre par `user_id`. Le frontend appelle l'API avec `credentials: 'include'`.
- Erreurs : forme uniforme `{ "error": { "code": "string", "message": "string" } }`.
- Codes HTTP : `200` OK, `201` cree, `400` requete invalide, `401` non authentifie, `403` interdit, `404` introuvable, `409` conflit, `422` non traitable (ex. JSON IA invalide, transcription impossible), `500` erreur serveur.
- Regle produit critique : une capture est TOUJOURS persistee (statut `processed_status` adequat) meme si la transcription ou l'analyse IA echoue. Un echec IA ne doit jamais perdre la capture ; il produit une capture en erreur, rejouable via `POST /api/captures/:id/analyze`.

Contrats des routes du coeur de boucle (les autres routes de la section 9.3 suivent les memes conventions) :

`POST /api/captures/text` — creer une capture texte et lancer l'analyse.
```
// req
{ "text": "faut que je relance le client X pour le devis avant vendredi" }
// res 201
{
  "capture": { "id": "uuid", "input_type": "text", "raw_transcript": "…", "processing_status": "analyzed", "created_at": "…" },
  "note": { "id": "uuid", "title": "…", "body": "…", "status": "inbox|accepted", "accepted_by": "ai|null", "confidence": 0.82, "project_id": "uuid|null" },
  "tasks": [ { "id": "uuid", "title": "…", "priority": "normal", "due_date": null, "status": "todo" } ],
  "auto_validated": false
}
```

`POST /api/captures/audio` — multipart `audio` (fichier). Transcrit, sauvegarde la Capture, puis meme reponse que ci-dessus. L'audio n'est pas conserve.

`GET /api/captures/:id` — renvoie la capture + son `processing_status` (`pending|transcribing|analyzing|analyzed|error`) et, si dispo, la note et les taches liees.

`POST /api/captures/:id/analyze` — (re)lance l'analyse IA. Meme forme de reponse que `POST /api/captures/text`. Renvoie `422` si le JSON IA est invalide (la capture reste persistee).

`GET /api/inbox` — liste des notes en statut `inbox` de l'utilisateur, triees par date, avec pour chaque note : `title`, `project_match` (nom + confidence), extrait de `body`, nombre de taches, tags.

`PATCH /api/notes/:id` — modifie une note proposee (`title`, `body`, `project_id`, tags, champs de taches). Renvoie la note mise a jour.

`POST /api/notes/:id/accept` — valide la note et ses taches (statut `accepted`, `accepted_by = user`), les rattache au projet, met a jour `last_activity_at` du projet.

`POST /api/notes/:id/archive` — passe la note en `archived`.

`GET /api/settings` / `PATCH /api/settings` — lit/modifie `UserSettings`. Defauts : `auto_validate_high_confidence=true`, `manual_review_all_captures=false`, `default_task_priority="normal"` (coherent avec 7.6 et l'ecran 10.4.10).

`GET /api/search?q=...` — recherche dans notes, taches, projets, `client_name` ET `raw_transcript` (regle produit). Renvoie des resultats types (`note|task|project`) avec le champ correspondant et de quoi surligner le terme (voir ecran 10.4.9).

Ce contrat doit etre fige et teste (section 9.3) avant de commencer le frontend (section 13, phases 2-3 avant phase 4).

## 10. Design d'interface

> Reference d'implementation : les sections 10.1 a 10.3 donnent l'intention. La section 10.4 "Maquettes de reference — specification d'implementation" fait foi pour le rendu (tokens, ecrans, etats) et doit etre suivie a la lettre par les agents qui construisent le frontend.

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

### 10.4 Maquettes de reference — specification d'implementation

Cette section fait foi pour l'implementation du frontend. Les maquettes haute fidelite ont ete produites dans Claude Design et livrees en handoff. Le frontend doit reproduire ces ecrans au pixel pres : memes couleurs, memes typographies, memes espacements, memes etats, memes textes.

Source du design (a lire integralement avant d'implementer) :

- `page_design(handoff)/project/Mantara Voice Inbox.dc.html` : prototype HTML/CSS de tous les ecrans.
- `page_design(handoff)/README.md` : consigne de handoff pour les agents.
- Captures de reference : `page_design(handoff)/project/screenshots/auth.png` et `overview.png`.

Regle : le HTML du handoff est un prototype, pas du code de production. On recree le rendu visuel dans la stack cible (Next.js + React), on ne copie pas la structure interne du prototype. En cas d'ambiguite entre ce document et le prototype HTML, le prototype fait foi pour le visuel.

Perimetre livre : 8 sections numerotees (01 a 08) couvrant tous les ecrans du MVP, chacune en variantes mobile (378 x 800) et bureau.

#### 10.4.1 Systeme de design (design tokens)

Polices Google Fonts (a precharger) :

- `Hanken Grotesk` (graisses 300 a 800, italique) : police principale de tout le texte.
- `IBM Plex Mono` (400, 500) : labels, meta, minuteurs, badges de confiance, codes courts. Toujours en MAJUSCULES avec `letter-spacing` autour de `.14em` pour les labels de section.

Variables de couleur (theme clair "Ivoire", par defaut) :

| Variable | Valeur | Usage |
| --- | --- | --- |
| `--paper` | `#f5f0e7` | fond doux, champs de saisie, cartes secondaires |
| `--surface` | `#fffdf8` | cartes principales, panneaux, cadre telephone |
| `--ink` | `#26221c` | texte principal, boutons pleins fonces |
| `--muted` | `#8a8175` | texte secondaire |
| `--faint` | `#b6ad9e` | texte tertiaire, elements desactives, onglets inactifs |
| `--border` | `#e7dfd1` | bordures de cartes et champs |
| `--hair` | `#efe8db` | separateurs fins (barres nav, entetes) |
| `--canvas` | `#e8e1d4` | fond de page, fond des overlays bureau |
| `--accent` | `#b5502f` | terracotta : actions primaires, enregistrement, liens |
| `--accent-soft` | `#f3e2d8` | fonds d'accent legers, surlignage de recherche |
| `--amber` | `#c08a2e` | confiance moyenne, priorite haute, echeances |
| `--good` | `#5c7a55` | confiance forte, succes, tache terminee |
| `--radius` | `20px` | rayon de coin par defaut |

Theme sombre (option "Ardoise") — surcharge des memes variables :

- `--paper:#26241f`, `--surface:#2f2c26`, `--ink:#f3eee4`, `--muted:#a89e8d`, `--faint:#6c6458` (~46% opacite), `--border:#3c392f`, `--hair:#34312a`, `--canvas:#1b1915`, `--accent-soft:#3a3128`. L'accent, l'amber et le good restent inchanges.

Options d'apparence exposees dans le design (a prevoir comme parametres de theme, non bloquant pour le MVP) :

- Couleur d'accent : `#b5502f` (defaut), `#3f6b8c` (bleu), `#4f6b4a` (vert), `#8a5a86` (violet).
- Style de coin : Doux `20px` (defaut), Net `6px`, Rond `30px`.
- Papier : Ivoire (clair) ou Ardoise (sombre).

Ces quatre couleurs d'accent servent aussi de pastilles de couleur par projet (petit carre arrondi de 7 a 10 px devant le nom du projet).

Ombres :

- Cartes, cadres telephone, fenetres bureau : `0 34px 64px -34px rgba(40,34,26,.45)`.
- Overlays / modales (capture rapide, palette de recherche) : `0 40px 80px -30px rgba(40,34,26,.6)`, avec voile de fond `rgba(38,34,28,.30-.35)`.
- Bouton micro au repos : `0 18px 40px -12px var(--accent)`.

Animations (keyframes definies dans le prototype) :

- `vibar` : barres de forme d'onde qui pulsent verticalement (`scaleY .22 -> 1`), 30 barres de 3 px, hauteurs et delais varies, `1.05s` en boucle. Affichee pendant l'enregistrement.
- `ring` : halo d'accent qui grandit et se dissout autour du bouton d'enregistrement (`scale 1 -> 2.4`, opacite `.45 -> 0`), `1.8s`.
- `blink` : point rouge d'enregistrement qui clignote (opacite `1 -> .25`), `1.1s`.
- `ring2` : spinner circulaire (rotation 360deg), `.9s` lineaire, pour l'etat "analyse en cours".

Iconographie : le design utilise des glyphes typographiques, pas une librairie d'icones. Correspondance a respecter : `◉` capture/enregistrer, `▤` Inbox, `◷` Aujourd'hui, `▦` Projets, `⌕` Recherche, `⚙` Parametres, `✎` ecrire, `✕` annuler, `‖` pause, `✓` fait, `▾` menu deroulant, `←` retour, `+` ajouter. Ils peuvent etre remplaces par des icones equivalentes en implementation, a condition de conserver le meme poids visuel et la meme sobriete.

#### 10.4.2 Composants transverses

Cadre mobile (toutes les maquettes mobile) :

- Dimensions `378 x 800`, `border-radius: 40px`, `overflow: hidden`, bordure `--border`, ombre de carte.
- Barre de statut haute de `46px` : heure `9:41` a gauche (IBM Plex Mono), `● ● ●` a droite en `--muted`.
- Contenu en `display:flex; flex-direction:column`, le corps prend `flex:1`.

Barre de navigation basse mobile :

- Hauteur `78-84px`, bord superieur `1px solid var(--hair)`.
- 4 entrees equireparties : `◉ Capture`, `▤ Inbox`, `◷ Auj.`, `▦ Projets`. Icone ~19px au-dessus d'un label IBM Plex Mono ~10px.
- Entree active en `--accent`, entrees inactives en `--faint`.

Barre laterale bureau (dashboard) :

- Largeur `236px`, fond `--paper`, bord droit `1px solid var(--border)`.
- En-tete : pastille logo accent `22x22` (radius 7) + "Mantara" en mono, majuscules, `letter-spacing .18em`.
- Bouton pleine largeur `◉ Nouvelle capture` : fond `--accent`, texte blanc, radius `12px`, poids 600.
- Navigation : `▤ Inbox` (avec pastille compteur accent, ex. `4`), `◷ Aujourd'hui`, `▦ Projets`, `⌕ Recherche`. Entree active : fond `--surface`, texte `--ink`, poids 600 ; inactive : `--muted`.
- Section "Projets actifs" (label mono majuscules `--faint`) : liste de projets avec pastille de couleur + nom. Projet actif surligne en `--accent-soft`, radius 8.
- Pied : avatar rond `JM` (fond `--ink`, texte `--surface`), nom "Jean M.", `⚙` a droite ; bord superieur `1px solid var(--border)`.

Badge de confiance IA (composant recurrent, IBM Plex Mono ~10px, `letter-spacing .05em`) :

- Forte : `● FORTE 0.92` en `--good`.
- Moyenne : `● MOYENNE 0.61` en `--amber`.
- Faible : `● FAIBLE 0.28` en `--faint`.

Etiquette de projet (chip) :

- Reconnu : chip a fond `--paper`, bordure `--border` pleine, pastille de couleur du projet + nom (ex. "Client X — Site vitrine").
- Incertain : chip a **bordure en pointilles** (`1px dashed`), texte `--muted`, libelle suffixe d'un `?` (ex. "Studio interne ?").
- Aucun : simple texte `--faint` ("Aucun projet reconnu" / "Aucun projet").

Ligne de tache :

- Case a cocher carree arrondie `~17px`, bordure `1.5px`. Non faite : bordure `--muted` (ou `--amber` si prioritaire/echeance proche). Faite : fond `--good`, coche blanche `✓`, texte barre et opacite reduite.
- A droite : indicateur de priorite. Soit pastille ronde de 7px (`--amber` haute, `--faint` normale/basse), soit label mono `HAUTE`/`NORMALE`/`BASSE` en couleur correspondante (`--amber` pour haute).

Interrupteur (toggle) : piste `46 x 27`, radius 100px. Actif : fond `--accent`, pastille blanche `21px` a droite. Inactif : piste `--border`, pastille a gauche.

Boutons :

- Primaire fonce : fond `--ink`, texte `--surface`, radius 12-14px, poids 600. Usage principal "Se connecter", "Valider", "Analyser".
- Primaire accent : fond `--accent`, texte blanc. Usage "Creer le compte", "Nouvelle capture", "Capturer pour ce projet".
- Secondaire : fond transparent, bordure `--border`, texte `--muted` ("Modifier", "Archiver", "Ecrire").
- Special "Choisir projet" (carte confiance moyenne) : bordure `--accent`, fond `--accent-soft`, texte `--accent`.

Labels de section : IBM Plex Mono, ~10-11px, MAJUSCULES, `letter-spacing .14em`, couleur `--muted`.

Titres d'ecran : ~26px mobile / 22-30px bureau, poids 800, `letter-spacing -0.02em`.

#### 10.4.3 Section 01 — Authentification

Sous-titre design : "Connexion e-mail + mot de passe · verification via Resend".

Mobile · Connexion :

- Logo accent + "Mantara" (mono) en haut, pousse vers le bas par `margin-bottom:auto`.
- Titre "Bon retour." (38px, poids 800). Sous-titre "Videz votre tete. On classe le reste." en `--muted`.
- Champs : label mono "E-mail" puis champ `--paper` bordure `--border` radius 14 ("jean@mantara.co") ; label "Mot de passe" puis champ masque `••••••••••` avec lien "Afficher" a droite en `--muted`.
- Lien "Mot de passe oublie ?" aligne a droite, en `--accent`.
- Bouton pleine largeur "Se connecter" (fond `--ink`).
- Pied centre : "Pas de compte ? **Creer un compte**" (accent).

Mobile · Creer un compte :

- Lien retour "← Connexion" en haut.
- Titre "Creer votre espace." Sous-titre "Un e-mail de verification vous sera envoye."
- Champs : "Nom" ("Jean Mercier"), "E-mail" ("jean@mantara.co"), "Mot de passe" (`••••••••••`).
- Indicateur de force du mot de passe : 4 segments de 4px ; 3 remplis en `--good`, 1 en `--border`.
- Bouton pleine largeur "Creer le compte" (fond `--accent`).
- Pied centre `--faint` : "En continuant, vous acceptez les conditions d'utilisation de Mantara."

Bureau · Connexion (`760 x 520`, deux colonnes) :

- Colonne gauche `320px`, fond `--ink`, texte clair : logo + "Mantara" en haut ; au centre label "Voice Inbox" et citation "« Dicter, comprendre, classer, agir. »" (24px, poids 600) ; en bas "Capture sans friction".
- Colonne droite : titre "Se connecter" (30px), champs "E-mail" et "Mot de passe" (radius 12), puis bouton "Se connecter" (`--ink`) suivi du lien "Mot de passe oublie ?".

#### 10.4.4 Section 02 — Capture

Sous-titre design : "Dicter une pensee en moins de 10 secondes · le moment central".

Mobile · Pret a enregistrer :

- En-tete : titre "Capture" (26px, 800) + rond `38px` `--paper`/`--border` avec `⌘`.
- Centre : texte "Appuyez et parlez. On s'occupe du classement." (`--muted`, centre).
- Bouton micro : anneau `150px` bordure `--accent-soft`, disque `112px` fond `--accent`, ombre accent, pastille micro blanche (26x40, radius 14) au centre.
- Pilule "✎ Ecrire a la place" (bordure `--border`, radius 100px) sous le bouton.
- Nav basse : Capture actif.

Mobile · Enregistrement en cours (ecran "vivant", fond `--ink`, texte clair) :

- Bandeau : point `--accent` animation `blink` + "ENREGISTREMENT" (mono) + minuteur "00:08" a droite.
- Centre : forme d'onde animee (`vibar`, 30 barres accent) puis texte dicte en direct, exemple "« Relancer le client X sur la validation du devis avant vendredi… »" (opacite .72).
- Barre d'actions bas : cercle `✕` (annuler), bouton central `88px` `--accent` avec halo `ring` et carre stop blanc, cercle `‖` (pause).

Mobile · Transcription & analyse IA :

- Label "Transcription" puis encart `--paper` avec le texte transcrit complet.
- Liste d'etapes verticale avec pastilles d'etat : "Voix transcrite" (pastille `--good` pleine, fait), "Analyse du contexte…" (spinner `ring2` `--accent`, en cours, poids 600), "Classement par projet" et "Extraction des taches" (bordure `--border`, opacite .4, en attente).
- Encart bas `--accent-soft` : "L'IA structure votre note. Si elle est sure, elle la classe directement — sinon elle la place dans l'Inbox."

Bureau · Capture rapide (overlay `⌘K`, cadre `760 x 520`) :

- Voile sombre sur `--canvas`, modale centree `520px` `--surface`, radius 20, ombre d'overlay.
- Point `blink` + "ENREGISTREMENT · 00:08" (mono).
- Bouton `68-76px` `--accent` avec halo `ring` + carre stop, a cote de la forme d'onde `vibar`.
- Texte dicte, puis actions : bouton "Analyser" (`--ink`), bouton "✎ Ecrire" (secondaire), et a droite "echap pour annuler" (mono `--faint`).

#### 10.4.5 Section 03 — Inbox (validation IA)

Sous-titre design : "Verifier ce que l'IA a compris · l'IA propose, vous gardez le controle".

Mobile · A valider (fond de page `--paper`) :

- En-tete : "Inbox" (26px) + compteur "4 a valider" en `--accent` (mono).
- Trois cartes empilees illustrant les trois niveaux de confiance :
  - **Forte** : chip projet "Client X — Site vitrine" + badge `● FORTE 0.92`. Titre "Relancer sur la validation du devis", extrait de note, meta "2 taches · 2 tags", actions "Valider" (`--ink`) + "Modifier" (secondaire).
  - **Moyenne** : chip pointille "Studio interne ?" + badge `● MOYENNE 0.61`. Titre "Refonte du systeme de couleurs", note "Idee de palette plus chaude pour la marque. A rattacher — projet incertain.", meta "0 tache · note", action unique "Choisir projet" (style accent-soft).
  - **Faible** : "Aucun projet reconnu" + badge `● FAIBLE 0.28`. Titre "Penser a reserver le studio photo", note "A classer manuellement." (pas de boutons).
- Nav basse : Inbox actif.

Bureau · Tableau de bord Inbox (`1180 x 720`, trois colonnes) :

- Colonne 1 : barre laterale (cf. 10.4.2), Inbox actif avec badge `4`.
- Colonne 2 (liste) : en-tete "Inbox" + filtres "Toutes · 4" (actif) et "A verifier · 2". Cartes compactes ; la carte forte selectionnee a une bordure `--accent` et un fond `--paper`.
- Colonne 3 (`340px`, panneau de detail) : chip projet + score `0.92` ; titre ; label "Note reformulee" + texte ; label "Taches extraites" + 2 lignes de tache avec pastille de priorite ; tags `#devis` `#relance` ; pied avec bouton "Valider & classer" (`--ink`) + bouton `⋯`.

#### 10.4.6 Section 04 — Detail de capture

Sous-titre design : "Voir et corriger le resultat IA · la transcription brute reste toujours accessible".

Mobile · Detail & correction :

- En-tete : "← Inbox" a gauche, badge `● FORTE 0.92` a droite.
- Titre editable (champ `input` sans bordure, 22px, 800) "Relancer sur la validation du devis", suivi d'un chip projet cliquable avec `▾`.
- Bloc "Note reformulee" : encart `--paper` editable.
- Bloc "Taches · 2" avec lien "+ Ajouter" : lignes de tache avec case + label priorite (`HAUTE` amber, `NORMALE` muted).
- Bloc "Transcription brute" : encart **bordure en pointilles**, texte en italique `--muted`, exemple "« euh… faut que je relance le client X pour le devis la, avant vendredi si possible, et voir si on ajuste le perimetre du site »".
- Pied : bouton "Valider" (`--ink`, flex 1) + "Archiver" (secondaire).

Bureau · Detail (`820 x 600`, deux colonnes brut vs. propose) :

- En-tete : fil "Inbox / Client X — Site vitrine" + statut "● Auto-validee par l'IA · confiance 0.92" (`--good`).
- Colonne gauche : titre editable (26px), "Note reformulee" (encart `--paper`), "Taches" + "+ Ajouter" avec lignes de tache.
- Colonne droite `300px` fond `--paper` : "Transcription brute" (italique `--muted`), "Pourquoi ce projet ?" avec justification IA ("La capture mentionne le devis et le site vitrine, deja associes a ce projet."), "Tags" (`#devis` `#relance`).

#### 10.4.7 Section 05 — Projets

Sous-titre design : "Client, mission interne, opportunite, chantier, idee · le niveau d'organisation principal".

Mobile · Liste des projets (fond `--paper`) :

- En-tete : "Projets" (26px) + `+` a droite.
- Cartes projet `--surface` radius 18 : pastille de couleur + nom + statut a droite (`ACTIF` en `--good`, `EN PAUSE` en `--amber`, mono). Meta mono "5 taches ouvertes · 12 notes". Barre de progression fine 4px (remplissage a la couleur du projet, ex. 62%, 40%, 22%).
  - Exemples : "Client X — Site vitrine" (accent, ACTIF), "Studio interne" (`#3f6b8c`, ACTIF), "Refonte de marque" (`#4f6b4a`, EN PAUSE).
- Carte finale en pointilles : "+ Nouveau projet".
- Nav basse : Projets actif.

Mobile · Detail d'un projet :

- "← Projets", pastille + statut mono "ACTIF · CLIENT", titre "Client X — Site vitrine" (25px), sous-titre "Derniere activite il y a 2 h".
- Bloc "Taches ouvertes · 5" : lignes de tache.
- Bloc "Notes recentes" : cartes `--paper` avec titre + meta ("il y a 2 h · voix", "hier · texte").
- Pied : bouton pleine largeur "◉ Capturer pour ce projet" (`--accent`).

Bureau · Vue projet (`1000 x 640`) :

- Barre laterale (Projets actif, projet courant surligne en `--accent-soft`).
- En-tete : statut mono "ACTIF · PROJET CLIENT", titre "Client X — Site vitrine" (28px), sous-titre "Client : Studio X · derniere activite il y a 2 h", et a droite deux compteurs "5 TACHES" / "12 NOTES" (chiffre 24px 800 + label mono).
- Corps deux colonnes : gauche "Taches ouvertes" (lignes de tache, la tache faite est barree/estompee) ; droite `290px` fond `--paper` "Activite" — timeline a pastilles ("Note ajoutee (voix) · il y a 2 h · auto-validee", "Tache terminee · hier", "Projet cree · il y a 6 j").

#### 10.4.8 Section 06 — Taches

Sous-titre design : "Savoir quoi faire · vue « Aujourd'hui » et vue « Par projet »".

Mobile · Aujourd'hui :

- En-tete : "Aujourd'hui" (26px) + sous-titre "3 taches · pas de retard. Respirez."
- Onglets : "A faire" (actif), "Cette semaine", "Par projet".
- Lignes de tache avec case, titre, et meta projet (pastille couleur + nom ; echeance en `--amber` ex. "echeance ven." ; "Sans projet" en `--faint`).
- Section "Terminees · 2" (label mono `--faint`) : taches barrees, estompees, case `--good` cochee.
- Nav basse : Auj. actif.

Bureau · Taches par projet (`1000 x 600`) :

- Barre laterale (Aujourd'hui actif).
- En-tete : "Taches" + onglets "Aujourd'hui", "Semaine", "Par projet" (actif).
- Corps groupe par projet : chaque groupe a un en-tete (pastille couleur + nom + compteur mono) puis ses lignes de tache. Les taches montrent echeance ("ven.") et priorite ("HAUTE"/"NORMALE") en mono a droite.

#### 10.4.9 Section 07 — Recherche globale

Sous-titre design : "Notes, taches, projets, clients — et jusqu'a la transcription brute".

Mobile · Resultats :

- Champ de recherche `--paper` avec `⌕`, terme "devis", `✕` pour effacer.
- Onglets/filtres : "Tout · 6" (actif), "Notes", "Taches", "Projets".
- Cartes de resultat avec badge de type (`TACHE` en accent sur `--accent-soft`, `NOTE`/`PROJET` en `--muted` bordure) + contexte projet. Le terme recherche est **surligne** en `<mark>` fond `--accent-soft` couleur `--accent`.
- Important : les resultats incluent la transcription brute (ex. "…transcription : « le **devis** la, avant vendredi… »"), conformement a la regle produit.

Bureau · Palette de recherche (overlay `⌘K`, cadre `720 x 520`) :

- Voile sombre, modale `560px` `--surface`, radius 18.
- Barre de saisie avec `⌕`, terme "devis", touche `esc` a droite (mono, encadree).
- Resultats groupes par type avec en-tetes mono : "Taches", "Notes & transcriptions", "Projets". Ligne survolee/active a fond `--paper`. Surlignage `<mark>` identique au mobile.

#### 10.4.10 Section 08 — Parametres

Sous-titre design : "Ajuster le niveau de controle sur l'IA · compte & authentification".

Mobile · Reglages :

- En-tete : "Parametres" (26px).
- Groupe "Validation par l'IA" (carte `--paper`) :
  - "Auto-validation" — "Classe seule les captures a forte confiance" — toggle **actif** (accent).
  - "Tout passe par l'Inbox" — "Valider chaque capture manuellement" — toggle **inactif**.
- Groupe "Taches" : "Priorite par defaut" avec 3 segments "Basse" / "Normale" (selectionne, fond `--ink`) / "Haute".
- Groupe "Compte" (carte `--paper`) : ligne profil (avatar `JM`, "Jean Mercier", "jean@mantara.co"), "Changer le mot de passe", "Se deconnecter" (en `--accent`).
- Nav basse presente.

Bureau · Reglages (`1000 x 600`) :

- Barre laterale (Parametres actif, footer surligne).
- Titre "Parametres" (26px), puis deux colonnes :
  - Gauche "Validation par l'IA" : "Auto-validation forte confiance" (toggle actif), "Tout passe par l'Inbox" (toggle inactif), "Priorite par defaut des taches" (3 segments, "Normale" selectionne).
  - Droite `280px` "Compte" (carte `--paper`) : profil + "Changer le mot de passe" + "Se deconnecter" (accent).

Ces valeurs par defaut d'interface (auto-validation activee, validation manuelle desactivee, priorite normale) doivent correspondre aux valeurs par defaut de `UserSettings` (section 8) et de l'API `/api/settings` (section 9.3).

#### 10.4.11 Regles de fidelite pour l'implementation

- Reproduire les tokens de la section 10.4.1 tels quels (memes hex, memes polices). Ne pas substituer une autre palette ou une autre police.
- Conserver les textes d'interface exactement comme dans les maquettes (libelles, sous-titres, textes d'aide), y compris les accents francais.
- Conserver les etats visuels distincts par niveau de confiance IA (forte/moyenne/faible) et leurs codes couleur (`--good`/`--amber`/`--faint`).
- Conserver la distinction visuelle projet reconnu (bordure pleine) vs projet incertain (bordure pointillee + `?`).
- Conserver la transcription brute toujours accessible et incluse dans la recherche (bloc pointille dedie, resultats surlignes).
- Mobile : navigation basse a 4 entrees et bouton de capture proeminent. Bureau : barre laterale `236px` + zone de contenu, avec panneaux de detail lateraux pour Inbox et Projet.
- Les animations `vibar`, `ring`, `blink`, `ring2` font partie du ressenti "vivant" de la capture : les reproduire.
- Prevoir le support du theme sombre (Ardoise) meme si son activation peut arriver apres le MVP.

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

Ce plan est ordonne selon la decision actee "backend/API d'abord, frontend ensuite". Chaque phase indique son objectif, ses livrables concrets et des criteres d'acceptation verifiables. Une phase n'est terminee que si tous ses criteres d'acceptation sont remplis. Ordre imperatif : phases 0 -> 5 ; ne pas commencer la phase 4 (frontend) avant que le contrat API de la phase 2/3 soit fige et teste.

### Phase 0 - Cadrage et setup (fondations)

Statut : **terminee le 8 juillet 2026** (criteres d'acceptation remplis). Deux points d'infra restent a la charge de l'utilisateur (interactifs) : voir plus bas.

Objectif : un projet qui demarre, avec la stack et les secrets en place.

Livrables :

- [x] Projet Next.js + TypeScript initialise (section 9.4), lint + format configures. Next.js 16 (App Router, Turbopack) + TypeScript, pnpm ; ESLint (flat config `eslint-config-next`) + Prettier ; scripts `dev`, `build`, `lint`, `format`, `typecheck`.
- [x] Fichiers d'environnement remplis avec les variables de la section 9.4 ; `.env.example` commite (sans valeurs). `.env.example` (template versionne) + `.env.local` (dev, ignore par git).
- [x] PostgreSQL installe et connexion verifiee (une requete de sante fonctionne). En dev : Postgres via Docker (`docker-compose.yml`, `pnpm db:up`) ; `GET /api/health` confirme la connexion (`db.ok = true`). En prod, la base sera auto-hebergee nativement sur la machine Mantara.
- [ ] Tunnel Cloudflare configure et expose le backend local. Prepare : `infra/cloudflared/config.example.yml` + guide `infra/cloudflared/README.md`, `cloudflared` installe. **Activation restante** : login interactif au compte Cloudflare de la zone `mantara-voice.fr` (`cloudflared tunnel login` + `create`) — a faire par l'utilisateur.
- [x] Structure de dossiers de la section 9.4 en place. `app/api`, `lib/{ai,db,auth}`, `db/migrations`, `tests`, `infra/cloudflared` ; interfaces `transcribe()` / `analyzeCapture()` + type `AnalysisResult` (section 7.3) poses.

Criteres d'acceptation :

- [x] `pnpm dev` demarre sans erreur (Ready ~1.4s, charge `.env.local`, aucun warning).
- [x] Un appel de sante `GET /api/health` renvoie `200` (avec check DB ; `503 degraded` si base injoignable).

Restant a la charge de l'utilisateur (non bloquant pour la phase 1) :

- Activer le tunnel Cloudflare (login interactif) — procedure dans `infra/cloudflared/README.md`.
- Renseigner les secrets reels dans `.env.local` avant la phase 3+ : `ANTHROPIC_API_KEY`, `AUTH_SECRET` (`openssl rand -base64 32`), `RESEND_API_KEY`.
- Commiter le depot git (initialise mais pas encore commite).

Ecart assume vs. specification initiale : Postgres tourne en local via Docker (aucun Postgres natif sur la machine de dev) plutot qu'installe nativement ; la topologie de prod (natif sur la machine Mantara) reste inchangee.

### Phase 1 - Modele de donnees

Statut : **terminee le 8 juillet 2026** (criteres d'acceptation remplis).

Objectif : schema Postgres complet et scope par utilisateur.

Livrables :

- [x] Migrations SQL pour toutes les entites de la section 8 : User (avec mot de passe hache, prete pour Auth.js en phase 2), UserSettings, Project, Capture, Note, Task, Tag, NoteTag. Migration versionnee `db/migrations/0001_init.sql` ; runner idempotent `scripts/migrate.mjs` (table `schema_migrations`, une transaction par fichier).
- [x] Enums/contraintes conformes a la section 8 (statuts, priorites, `input_type`, `accepted_by`, etc.). Enums Postgres natifs ; contraintes `confidence` ∈ [0,1] et note `inbox` => `accepted_by` NULL ; ids UUID, `updated_at` par trigger, FK `user_id` en `ON DELETE CASCADE`.
- [x] Filtrage applicatif par `user_id` sur toutes les requetes. Helpers typés `lib/db/queries.ts` (+ types `lib/db/types.ts`) : chaque fonction filtre par `user_id`. Policies RLS non ajoutees (optionnelles).
- [x] Script de seed : 1 utilisateur de test, 3 projets, quelques captures/notes/taches (cf. maquettes : "Client X — Site vitrine", "Studio interne", "Refonte de marque"). `scripts/seed.mjs` idempotent ; mot de passe hache via bcryptjs (pur JS, reutilise en phase 2).

Criteres d'acceptation :

- [x] Les migrations s'appliquent proprement sur une base vierge (`pnpm db:reset:all`).
- [x] Un utilisateur ne peut lire/ecrire que ses propres lignes (scoping `user_id` teste) — `tests/scoping.mjs` (`pnpm test:scoping`).
- [x] `UserSettings` par defaut = section 7.6 / 9.5 (auto-validation activee, validation manuelle desactivee, priorite normale), verifie par le test de scoping.

### Phase 2 - API standalone avec IA simulee

Statut : **terminee le 9 juillet 2026** (criteres d'acceptation remplis).

Objectif : figer le contrat API (section 9.5) sans dependre des fournisseurs IA reels.

Livrables :

- [x] Toutes les routes de la section 9.3, respectant les conventions et contrats de la section 9.5. Routes implementees sous `app/api/**` : auth, captures texte/audio, analyse/reanalyse, Inbox, notes, projets, taches, recherche, reglages.
- [x] Authentification branchee (Auth.js, email + mot de passe) ; routes protegees renvoient `401/403` correctement. Auth.js credentials configure dans `auth.ts`, mot de passe verifie avec bcrypt, session cookie, helper `requireSession()`.
- [x] `analyzeCapture()` implemente en mock deterministe renvoyant le JSON de la section 7.3 (cas variables : forte, moyenne, faible, nouveau projet, zero tache). Implementation dans `lib/ai/mock-analyzer.ts`.
- [x] Regle d'auto-validation de la section 7.6 implementee cote backend. La decision est recalculee dans le service de capture/analyse, independamment du signal LLM.
- [x] Suite de tests API sans frontend (scripts ou collection) couvrant la boucle complete et les cas d'erreur. Suite `tests/api-phase2.mjs`, commande `pnpm test:api`.

Criteres d'acceptation :

- [x] Scenario complet vert : creer une capture texte -> analyse -> note auto-validee OU en Inbox selon 7.6 -> modifier -> valider -> retrouver la note dans un projet avec ses taches. Verifie par `pnpm test:api`.
- [x] Cas d'erreur observables : JSON IA invalide (`422`, capture conservee), projet incertain (Inbox), aucune tache detectee, ressource d'un autre utilisateur (`403`). Verifie par `pnpm test:api`.
- [x] La forme des reponses est stable et documentee (elle sert de contrat au frontend). Contrat documente dans `SPEC_DESIGN.md` section 9.5, `README.md` et `tests/README.md`.

### Phase 3 - IA reelle (transcription + analyse)

Objectif : remplacer les mocks par les fournisseurs reels derriere les memes interfaces.

Livrables :

- `transcribe()` branche sur le STT reel (section 9.4) ; `POST /api/captures/audio` fonctionne avec un vrai fichier audio.
- `analyzeCapture()` branche sur Claude avec sortie JSON structuree ; contexte injecte dans le prompt : liste des projets existants, `client_name` connus, notes recentes pertinentes, tags existants (section 7.2).
- Gestion robuste des sorties LLM : validation du JSON, repli en Inbox si invalide, jamais de perte de capture.

Criteres d'acceptation :

- Les 4 cas passent avec l'IA reelle : projet reconnu, projet incertain, nouveau projet suggere, aucune tache detectee.
- Le contrat API de la phase 2 reste inchange (le frontend pourra s'y fier).
- Aucune donnee audio n'est persistee apres transcription.

### Phase 4 - Frontend (fidele aux maquettes)

Objectif : construire l'UI en consommant l'API deja validee, au pixel pres avec la section 10.4.

Livrables (chaque ecran suit sa sous-section 10.4 dediee) :

- Systeme de design : tokens, polices, composants transverses (10.4.1, 10.4.2).
- Authentification (10.4.3) ; Capture + etats d'enregistrement/analyse et animations (10.4.4) ; Inbox mobile + tableau de bord bureau (10.4.5) ; Detail de capture (10.4.6) ; Projets liste/detail/bureau (10.4.7) ; Taches Aujourd'hui/Par projet (10.4.8) ; Recherche mobile + palette bureau (10.4.9) ; Parametres (10.4.10).
- Navigation : barre basse mobile 4 entrees, barre laterale bureau 236px.
- Branchement complet aux routes de la section 9.5.

Criteres d'acceptation :

- Chaque ecran correspond visuellement a sa maquette (couleurs, typo, espacements, etats, textes verbatim) — checklist 10.4.11.
- Parcours mobile teste : dicter -> voir l'analyse -> valider/corriger -> retrouver dans un projet.
- Parcours bureau teste : capture rapide (⌘K), tableau de bord Inbox, recherche (⌘K).
- Les etats de confiance (forte/moyenne/faible) et projet reconnu/incertain sont visuellement distincts.

### Phase 5 - Deploiement, durcissement et PWA

Objectif : mettre en ligne et stabiliser.

Livrables :

- Frontend sur Vercel (`app.mantara-voice.fr`) ; backend + Postgres + IA sur la machine Mantara, exposes via le tunnel Cloudflare (`api.mantara-voice.fr`) ; le frontend pointe sur cette URL.
- Sous-domaines `app.` et `api.` configures (DNS Cloudflare + domaine custom Vercel) ; tunnel Cloudflare persistant (redemarre avec la machine) ; CORS backend autorisant `https://app.mantara-voice.fr` avec credentials.
- Emails transactionnels Resend actifs (verification, reinitialisation mot de passe).
- Verification finale : audio non conserve ; scoping `user_id` verifie en production ; secrets hors du repo.
- Corrections d'ergonomie ; stabilisation du flux complet.
- Installation PWA finalisee (apres validation backend + frontend + deploiement).

Criteres d'acceptation :

- L'app est accessible en ligne sur mobile et bureau.
- La boucle "dicter -> comprendre -> classer -> agir" fonctionne de bout en bout en production.
- Les criteres de la section 14 (definition de succes) sont remplis.

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
