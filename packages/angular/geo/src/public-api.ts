/*
 * API publique du point d'entrée @lionelcointot/ui-angular/geo : régions, départements, communes et adresses
 * françaises lus depuis les API officielles (aucune donnée embarquée). Importe `forms` (ADR 0007).
 * Les textes saisis dans les champs commune et adresse sont envoyés aux services publics : voir README.md.
 */
export * from './geo.types';
export * from './geo-data-source';
export * from './geo-options';
export * from './gouv-geo-data-source';
export * from './provide-lc-geo';
