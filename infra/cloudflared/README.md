# Tunnel Cloudflare — backend Mantara

Expose le backend local (`http://localhost:3000`) sur `https://api.mantara-voice.fr`
(SPEC_DESIGN.md sections 9.4 / 9.5). `cloudflared` est deja installe sur la machine
(`cloudflared --version`).

## Mise en place (une fois)

Ces etapes demandent une authentification interactive au compte Cloudflare qui gere
la zone `mantara-voice.fr` — a executer par l'utilisateur.

```sh
# 1. Authentifier cloudflared (ouvre le navigateur, choisir la zone mantara-voice.fr)
cloudflared tunnel login

# 2. Creer un tunnel nomme (genere infra/cloudflared/<TUNNEL_ID>.json)
cloudflared tunnel create mantara-voice

# 3. Router le sous-domaine vers le tunnel
cloudflared tunnel route dns mantara-voice api.mantara-voice.fr

# 4. Copier le modele et renseigner l'ID
cp infra/cloudflared/config.example.yml infra/cloudflared/config.yml
#   -> remplacer <TUNNEL_ID> par l'ID affiche a l'etape 2
```

## Lancer

```sh
pnpm tunnel          # cloudflared tunnel --config infra/cloudflared/config.yml run
```

## Persistance (Windows)

Pour que le tunnel redemarre avec la machine (exigence section 9.4), l'installer
en service :

```sh
cloudflared --config infra/cloudflared/config.yml service install
```

## Securite

`<TUNNEL_ID>.json` et `cert.pem` sont des secrets — ignores par git.
