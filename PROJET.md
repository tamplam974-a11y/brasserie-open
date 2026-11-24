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
| 2 | Boîte à outils en ligne | v0.2 : réfractomètre, dilution, volume, amertume. Reste : eau, sucre de refermentation |
| 3-4 | Éditeur de recettes, équipements, ingrédients, diagramme multi-houblons | à faire |
| 5 | Mode jour de brassage | à faire |
| 6 | Journal de fermentation | à faire |
| 7 | Stocks et coûts | à faire |
| 8 | Hors-ligne, import/export BeerXML, tests finaux | à faire |

## Recadrage (v0.3)
Objectif principal : **calculateur de recettes** (malts, houblons, levures, styles BJCP, bilan comparé au style). Les outils (réfractomètre, dilution…) passent au second plan. Inspiration fonctionnelle : OpenMaltForge. Conception, code et données originaux, sans copie.

## v0.4
Thème gris clair, bilan à droite et sticky (mise à jour en direct), houblons : FWH et hopstand avec température (équivalent minutes par Arrhenius, à valider).

## v0.5
Thème sombre (gris foncé) avec bouton de bascule, choix mémorisé dans le navigateur. Défaut : thème clair.

## v0.6
Bouton Mémoriser (recette conservée dans le navigateur, rechargée à l’ouverture), en-têtes de colonnes des houblons et IBU par ligne (hopIbu dans calcRecipe).

## v0.7
Houblons : tableau resserré (plus de défilement horizontal sur ordinateur), température modifiable pour toutes les additions sauf le dry hop (100 °C par défaut en ébullition ; plus bas, l’utilisation diminue selon Arrhenius).

## v0.8
Température réservée au hopstand (ébullition, FWH et dry hop sans champ modifiable). FWH : +10 % d’IBU par rapport à la même durée d’ébullition (FWH_FACTOR). Malts : colonne de pourcentage.

## v0.9
Page de recette compactée : style, volume, rendement et levure sur une ligne, boutons d’ajout sur la ligne des titres, espacements réduits. Le bilan garde sa hauteur.

## v0.10
Module Levure restauré. Bilan : curseurs Densité initiale (met à l’échelle tous les malts) et Amertume (met à l’échelle les houblons amérisants, pas le dry hop), au pointeur et au clavier.

## v0.11
Boutons + et − sur les poids (malts 0,1 kg, houblons 5 g, aussi flèches haut/bas). Export et import de la recette en fichier JSON (la recette mémorisée vit dans le navigateur, adresse localhost:5173).

## v0.12
Bibliothèque de recettes nommées (liste, nouvelle, supprimer, indicateur « non mémorisé »), export et import de fiches HTML (données embarquées), module Empâtage et volumes d’eau (paliers, eau d’empâtage, température, rinçage, volume pré-ébullition). Les anciennes recettes uniques sont migrées. Styles BJCP : liste complète à faire (voir ci-dessous).

## À décider : styles BJCP
Les lignes directrices BJCP sont protégées. Ajouter les styles un par un à partir de la source officielle, ou prévoir un import de styles personnalisés.

## v0.13
Styles ajoutés : American Wheat Beer, Lichtenhainer, Berliner Weisse, Oud Bruin, Lambic, Imperial Stout, American Barleywine. Identifiants corrigés (Weissbier 10A, English Barleywine 17D) avec conversion des anciennes recettes. Plages à vérifier sur bjcp.org.

## Moteur de calcul (src/engine)
- gravity.ts : alcool, atténuation, Plato/Brix/SG, correction de température, réfractomètre, dilution, recalibrage de volume
- bitterness.ts : IBU Tinseth, contributions par houblon
- recipe.ts : DI, DF, alcool, IBU, couleur d’une recette
- data/ : malts, houblons, levures, styles (valeurs typiques génériques, à vérifier)
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

## v0.14
Onglet Ingrédients (3 modules : malts, houblons, levures) avec ajout et suppression d’ingrédients personnalisés ; catalogues de départ Best Malz, Dingemans, Lallemand, Wyeast, White Labs, Kveik (valeurs indicatives à vérifier). Export et import BeerXML (ingrédients inconnus créés à l’import ; température du hopstand conservée via X_TEMP). Les vues restent montées : plus de perte des modifications au changement d’onglet.

## v0.15
Port fixe 5174 (strictPort) : les recettes mémorisées dépendent de l’adresse du navigateur. Adresse affichée en bas de page. 37 houblons américains et néo-zélandais ajoutés (valeurs indicatives). Jauges du bilan : vert dans la plage du style, puis dégradé jaune, rouge selon l’écart (gauge.ts).

## v0.16
Import de catalogues CSV (malts, houblons, levures) : séparateur ; , ou tabulation, virgule décimale, fourchettes (75-80) ramenées à la moyenne, en-têtes reconnus en français ou en anglais, modèles téléchargeables. Une marque importée qui correspond à un catalogue indicatif (Best Malz, Dingemans, Lallemand, Wyeast, White Labs, Kveik) le remplace. Jauges : barre dégradée rouge, jaune, vert, jaune, rouge.

## v0.17
Bouton Redimensionner (volume, malts et houblons multipliés dans la même proportion ; pertes et évaporation inchangées), bouton Notes (avant, pendant, après le brassage ; mémorisées avec la recette, présentes dans la fiche HTML et le champ NOTES du BeerXML), diagramme radar de l’association des arômes de houblon sous le bilan (aroma.ts : familles d’arômes pondérées par grammes et usage). Menu Fichiers regroupant exports et imports.

## v0.18
Diagrammes en couleur (houblons) et nouveau diagramme de la levure (profil estimé à partir du nom et du type : yeastProfile.ts). Onglet Amertume retiré ; nouvel onglet Taux d’alcool (DI, DF, sucre de ressucrage : formule simple, formule précise de Hall, alcool apporté par le sucre à 95 % du rendement théorique).

## v0.19
Diagrammes houblon et levure plus grands et plus proches de leur titre ; zone principale élargie (1280 px) ; EBC de chaque malt dans la recette ; bouton Retour (historique de 50 étapes, modifications rapprochées regroupées) ; bouton Enregistrer sous (clone de la recette, l’original reste tel que mémorisé).

## v0.20
Onglet Mes recettes (cartes et liste, recherche, tri, couleur de la bière, bouton Ouvrir) et onglet Houblons (comparaison de jusqu’à 5 houblons sur un même diagramme avec leur association, et tableau de tous les houblons). aroma.ts : hopProfile et combineProfiles ; beerColor.ts : couleur selon le SRM.

## v0.21
Recette : EBC des malts affiché dans une case grise (comme les champs) ; colonne % alpha-acides placée à gauche de la colonne grammes dans les houblons.

## v0.22
Recette : indicateurs DI, IBU et EBC entre le titre Malts et le bouton + Malt, colorés selon l’écart au style (mêmes teintes que le bilan).

## v0.23
Indicateurs DI, DF, IBU, EBC, ABV en gros, chacun dans une case grise. Liste des recettes au nom fixe « Liste » (la case voisine porte le nom de la recette en cours). Appel rapide (recherche au clavier) pour malts, houblons et levure. Croix de suppression dans Mes recettes (via la recette en cours de l’éditeur, avec confirmation).

## v0.24
Mes recettes : bouton Supprimer visible dans les cartes. Recette : EBC modifiable pour chaque malt (propre à la recette, pris en compte dans le calcul, le BeerXML et le redimensionnement). Onglet Styles (liste, ajout, import CSV, remplacement par numéro ; styles personnalisés mémorisés). Onglet Fiche de brassage (imprimable, tirée de la recette en cours : ingrédients, eau, empâtage, chronologie des houblons, cases de mesures, notes).

## v0.25
Barre de la recette sur deux lignes (nom plus large). Onglet Carbonatation (style, volume, température de fermentation, sucre, volumes de CO2 visés ; pression en fût ; carbonation.ts). Onglet Densimètre : import CSV de relevés iSpindel, Tilt, RAPT et autres, chargement par adresse, saisie manuelle, analyse (alcool, atténuation, vitesse, stabilité) et courbe (hydrometer.ts). La réception directe d’un webhook demandera un petit relais en ligne.

## v0.26
Partage : `npm run partage` (site construit servi sur le port 5174, mêmes recettes mémorisées que `npm run dev`), `npm run reseau` (même chose, visible sur le Wi-Fi), tunnel cloudflared pour une adresse publique temporaire, workflow GitHub Pages prêt dans docs/. Guide complet : PARTAGE.md. Les données restent dans le navigateur de chaque visiteur.

## v0.27
Fiche de brassage compactée pour tenir sur une page A4. Houblons et liste des recettes : lignes serrées, sans séparateurs. Mes recettes : ordre manuel (glisser-déposer et flèches, cartes et liste), appliqué par l’éditeur. Réfractomètre : densité initiale en SG, Brix lu. Dilution et concentration : ajout de sucre pour monter la densité (volume ajouté pris en compte). Nom de la recette en gros et en gras. PARTAGE.md : sécurité du dépôt.

## v0.28
Réfractomètre : retrouver la densité initiale à partir de la densité lue au densimètre et du °Brix lu au réfractomètre (inversion de la formule cubique par dichotomie, originalGravityFromReadings).

## v0.29
Onglet Dilution et concentration : deux sections indépendantes, Dilution (volume, densité actuelle, densité souhaitée, recalibrage du volume) puis Concentration (volume, densité actuelle, densité souhaitée ; par évaporation et par ajout de sucre).

## v0.30
Export CSV des malts, houblons, levures et styles personnalisés (mêmes colonnes que l’import). Onglet Sauvegarde : export et import de toutes les données (recettes, ingrédients, styles, relevés), en fusion ou en remplacement. Fiche HTML d’une recette portable : les ingrédients et le style personnalisés qu’elle utilise y sont embarqués et recréés à l’import.

## v0.31
Mes recettes : menu Fichiers pour exporter et importer toute la bibliothèque en BeerXML (plusieurs recettes dans un fichier) et en CSV (une ligne par malt, houblon ou palier). Date de la dernière sauvegarde rappelée en bas de page et dans l’onglet Sauvegarde. README.md pour le dépôt, PARTAGE.md complété (partager le code, panne du PC).

## v0.32
Mes recettes : recherche par numéro de recette (le nombre au début du nom, par préfixe) et tri par numéro croissant ou décroissant (recipeNumber). Écarts d’IBU entre logiciels : à analyser avec les captures de l’utilisateur (forme du houblon, densité d’ébullition, volume, hopstand, formule).

## v0.33
Numéro de version affiché en bas de page (injecté par Vite depuis package.json). PARTAGE.md : dépannage « la version locale n’est pas à jour ».

## v0.34
Application installable (PWA) : manifeste, icônes (192, 512, adaptable, Apple), service worker (réseau d’abord pour les pages, mémoire d’abord pour /assets/), bouton Installer. Enregistré seulement hors localhost. Test de cohérence du manifeste et des icônes.
