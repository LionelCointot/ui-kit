// Tests unitaires (jsdom) : la feuille de tokens du kit n'est pas chargée ; les directives qui lisent `--lc-sys-duration-*` y trouveraient une durée nulle et ne joueraient rien.
// On pose ici les deux tokens du compteur (valeurs de packages/tokens), pour que sa boucle rAF soit exercée avec une horloge fictive.
const root = document.documentElement.style;
root.setProperty('--lc-count-up-duration', '1200ms');
root.setProperty('--lc-sys-easing-out', 'cubic-bezier(0.215, 0.61, 0.355, 1)');
