# lib/auth

Helpers de session Auth.js (NextAuth), email + mot de passe, sans Magic Link
(SPEC_DESIGN.md sections 9.4 et 9.5).

Vide en phase 0. Contenu attendu en phase 2 :

- configuration Auth.js (Credentials provider, bcrypt) ;
- helper `requireSession()` renvoyant `401` sans session valide ;
- scoping `user_id` reutilise par les routes protegees.

Session : cookie `HttpOnly`, `Secure`, `SameSite=Lax`, `Domain=.mantara-voice.fr`.
