# PROJET : brasserie-open

Outils et application de gestion de brassage amateur. Gratuit, open source (MIT), en français d'abord.

## Décisions
- Licence MIT, projet gratuit pour la communauté.
- Stack prévue : TypeScript, Next.js (PWA hors-ligne), Supabase, Tailwind.
- Compte facultatif : tout doit fonctionner en local sans inscription.
- Unités : métrique par défaut, US en option.
- Aucune copie de code ou de base de données d'autres logiciels.

## Feuille de route
| Semaine | Livrable | État |
|---|---|---|
| 1 | Moteur de calcul testé | fait (v0.1) |
| 2 | Boîte à outils en ligne (réfractomètre, dilution, volume, eau, sucre de refermentation) | à faire |
| 3-4 | Éditeur de recettes, équipements, ingrédients, diagramme multi-houblons | à faire |
| 5 | Mode jour de brassage | à faire |
| 6 | Journal de fermentation | à faire |
| 7 | Stocks et coûts | à faire |
| 8 | Hors-ligne, import/export BeerXML, tests finaux | à faire |

## Moteur de calcul (src/engine)
- gravity.ts : alcool, atténuation, Plato/Brix/SG, correction de température, réfractomètre, dilution, recalibrage de volume
- bitterness.ts : IBU Tinseth, contributions par houblon
- color.ts : couleur Morey (SRM, EBC)

## À valider avant publication
- Formule réfractomètre en fermentation : comparer avec au moins un calculateur de référence et des mesures réelles.
- Correction de température : comparer avec une table de référence du fabricant du densimètre.
- IBU : la formule ne distingue pas encore houblon en cônes et en pellets, ni le whirlpool.

## À faire ensuite
- Outils d'eau (sels, pH de mash), sucre de refermentation, calcul de la pression en keg.
- Plus de tests avec des recettes de référence réelles.

## Commandes
- `npm install` : installer les dépendances
- `npm test` : lancer les tests
- `npm run typecheck` : vérifier les types
