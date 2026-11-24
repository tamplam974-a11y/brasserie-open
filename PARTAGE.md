# Partager le site

Le site est un ensemble de fichiers statiques : il n'a pas de serveur de données. **Les recettes, les ingrédients et les relevés de chaque personne restent dans son propre navigateur.** Quelqu'un qui ouvre ton lien voit un site vide, avec ses propres données. Pour échanger une recette : Fichiers > Exporter HTML ou BeerXML.

## A. Depuis ton PC (le site reste sur ton ordinateur)

Un « tunnel » donne une adresse publique qui mène à ton PC. Le PC doit rester allumé et les deux fenêtres ouvertes.

Installation de cloudflared (une seule fois, Linux Mint) :

    cd ~/Téléchargements
    wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared-linux-amd64.deb

À chaque partage :

1. Arrête le serveur de développement s'il tourne (Ctrl+C), il utilise le même port.
2. Fenêtre 1 : `cd ~/brasserie-open && npm run partage`
3. Fenêtre 2 : `cloudflared tunnel --url http://localhost:5174`
4. Copie l'adresse `https://xxxx.trycloudflare.com` affichée et envoie-la.

Ctrl+C dans les deux fenêtres ferme le partage. L'adresse change à chaque fois. Toi, continue à ouvrir `http://localhost:5174` pour retrouver tes recettes.

## B. Sur le réseau de la maison (Wi-Fi)

    npm run reseau

Puis, sur un autre appareil du même Wi-Fi : `http://ADRESSE_IP_DU_PC:5174` (l'adresse s'obtient avec `hostname -I`). Si un pare-feu bloque : `sudo ufw allow 5174`.

## C. En ligne en permanence (GitHub Pages)

Le site est hébergé gratuitement par GitHub, sans laisser le PC allumé. Le code du projet est public.

    mkdir -p .github/workflows
    cp docs/publication-github-pages.yml .github/workflows/pages.yml
    git add . && git commit -m "Publication GitHub Pages" && git push

Sur GitHub : Settings > Pages > Source : « GitHub Actions ». L'adresse sera `https://TON-PSEUDO.github.io/brasserie-open/`.

## Qui peut modifier le projet ?

Le dépôt GitHub est public : **tout le monde peut le lire, le copier ou en faire sa propre version (fork)**, mais **seuls toi et les personnes que tu ajoutes comme collaborateurs peuvent modifier ton dépôt**. Les autres peuvent proposer un changement (pull request) que tu es libre d'accepter ou de refuser. Le site publié ne change que lorsque tu envoies (`git push`) sur la branche `main`.

Bonnes pratiques :

- n'ajoute des collaborateurs que si tu leur fais confiance ;
- active la validation en deux étapes sur ton compte GitHub ;
- ne mets jamais de mot de passe ou de clé dans le code (il n'y en a aucun dans ce projet) ;
- pour travailler sans publier : crée une branche (`git switch -c travail`), et ne fusionne dans `main` que ce qui est prêt ;
- facultatif : Settings > Branches > règle de protection sur `main`.

Les autres personnes peuvent réutiliser ton code selon la licence MIT choisie à la création du dépôt.

## Où sont mes recettes ?

Les recettes, ingrédients et styles personnalisés sont enregistrés **dans le navigateur, sur l'appareil où vous les saisissez**, et pour **une adresse précise**. GitHub n'héberge que le code du site, jamais vos données.

- La version en ligne (`…github.io/brasserie-open/`) et la version locale (`localhost:5174`) sont **deux espaces séparés**, même dans le même navigateur.
- Un autre navigateur, un autre appareil, la navigation privée ou l'effacement des données du site donnent un espace vide.
- Pour déplacer ou sauvegarder : onglet **Sauvegarde** (tout en un fichier), ou Fichiers > Exporter HTML / BeerXML pour une recette, ou Exporter CSV dans les onglets Ingrédients et Styles.

## Partager le code avec d'autres brasseurs

Dépôt public : `https://github.com/tamplam974-a11y/brasserie-open`. Pour partager :

- **le site** (le plus simple pour utiliser) : envoyez `https://tamplam974-a11y.github.io/brasserie-open/` ;
- **le code** : envoyez l'adresse du dépôt. Chacun peut cliquer sur **Code > Download ZIP**, ou taper `git clone https://github.com/tamplam974-a11y/brasserie-open.git` puis `npm install` et `npm run dev` ;
- **leur propre version en ligne** : bouton **Fork** sur le dépôt, puis dans leur copie : onglet Actions (activer les workflows), Settings > Pages > Source « GitHub Actions ». Leur adresse sera `https://LEUR-PSEUDO.github.io/brasserie-open/` ;
- **proposer une amélioration** : « Pull request » depuis leur fork ; vous choisissez d'accepter ou non.

Ils n'ont accès ni à vos recettes, ni à votre compte : les données de chacun restent dans son navigateur.

## Perte ou panne du PC

La version en ligne protège le **site**, pas les **données** : les recettes sont dans le navigateur de l'appareil, en ligne comme en local. Seule une copie **hors de l'appareil** les protège. Exportez régulièrement (onglet Sauvegarde, ou Mes recettes > Fichiers) vers un autre support : clé USB, cloud personnel ou e-mail à vous-même. Ne mettez pas vos recettes dans le dépôt public.
