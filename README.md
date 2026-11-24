# Brasserie Open

Outils gratuits pour le brassage amateur, en français : calculateur de recettes (DI, DF, alcool, IBU, couleur), bilan comparé au style, diagrammes d'arômes, empâtage et volumes d'eau, fiche de brassage imprimable, réfractomètre, dilution et concentration, carbonatation, suivi de densimètre connecté, import et export (BeerXML, CSV, HTML).

**Utiliser le site : https://tamplam974-a11y.github.io/brasserie-open/**

## Vos données

Elles restent dans votre navigateur, jamais sur un serveur. Pensez à l'onglet **Sauvegarde** pour les exporter régulièrement.

## Lancer sa propre copie

```bash
git clone https://github.com/tamplam974-a11y/brasserie-open.git
cd brasserie-open
npm install
npm run dev      # http://localhost:5174
npm test         # tests des calculs
```

Pour publier votre version sur GitHub Pages : forkez le dépôt, activez les Actions, puis Settings > Pages > Source « GitHub Actions » (voir `PARTAGE.md`).

## À savoir

- Les calculs sont des estimations de brasseur amateur : vérifiez avec vos mesures.
- Les catalogues de malts, houblons et levures sont **indicatifs** ; importez vos propres valeurs (CSV).
- Les fourchettes de styles sont des repères à vérifier à la source officielle avant tout usage sérieux ; elles ne remplacent pas le guide BJCP.

## Licence

MIT. Idées et corrections bienvenues via les « issues » et « pull requests ».
