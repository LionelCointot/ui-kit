/** Période de dates ISO (AAAA-MM-JJ), bornes incluses ; une borne nulle ne borne pas. */
export interface LcDateInterval {
  readonly from: string | null;
  readonly to: string | null;
}

/** Raccourci de période, calculé à partir de la date du jour du poste (ISO). */
export interface LcDateIntervalPreset {
  readonly label: string;
  readonly interval: (today: string) => LcDateInterval;
}
