import type { BodyScan } from "../lib/types";

/**
 * Baseline Tanita MC-780MA-N scans, transcribed from Colin's photographed
 * console readouts (Apr–Jul 2026).
 *
 * The Apr 25 scan only has the FAT screen photographed, so muscle/water/
 * visceral/BMR are absent for that date. That's fine — every field is optional
 * and the charts skip gaps rather than interpolating.
 *
 * Sanity check performed at transcription time: segmental muscle values sum to
 * the displayed muscle-mass total on each date (75.6 / 74.9 / 75.3 kg), and
 * fat mass equals weight × bodyFatPct to within rounding. Do not "correct"
 * these numbers without re-reading the source photos.
 */
export const SEED_SCANS: BodyScan[] = [
  {
    date: "2026-04-25",
    weightKg: 104.2,
    bodyFatPct: 24.0,
    fatMassKg: 25.0,
    segFat: { trunk: 27.0, armL: 20.4, armR: 20.4, legL: 20.7, legR: 20.3 },
    source: "tanita",
  },
  {
    date: "2026-05-24",
    weightKg: 103.4,
    bodyFatPct: 23.1,
    fatMassKg: 23.9,
    musclePct: 73.1,
    muscleMassKg: 75.6,
    bodyWaterPct: 52.4,
    bodyWaterKg: 54.2,
    visceralFat: 10,
    bmrKcal: 2357,
    bmi: 30.2,
    segFat:    { trunk: 26.0, armL: 19.8, armR: 19.2, legL: 20.1, legR: 19.6 },
    segMuscle: { trunk: 39.2, armL: 5.0,  armR: 5.0,  legL: 13.1, legR: 13.3 },
    source: "tanita",
  },
  {
    date: "2026-06-12",
    weightKg: 101.7,
    bodyFatPct: 22.5,
    fatMassKg: 22.9,
    musclePct: 73.6,
    muscleMassKg: 74.9,
    bodyWaterPct: 53.0,
    bodyWaterKg: 53.9,
    visceralFat: 9,
    bmrKcal: 2331,
    segFat:    { trunk: 25.4, armL: 19.8, armR: 19.6, legL: 19.0, legR: 18.4 },
    segMuscle: { trunk: 38.8, armL: 4.9,  armR: 4.9,  legL: 13.1, legR: 13.2 },
    source: "tanita",
  },
  {
    date: "2026-07-16",
    weightKg: 100.2,
    bodyFatPct: 21.0,
    fatMassKg: 21.0,
    musclePct: 75.1,
    muscleMassKg: 75.3,
    bodyWaterPct: 53.7,
    bodyWaterKg: 53.8,
    visceralFat: 8,
    bmrKcal: 2337,
    segFat:    { trunk: 23.5, armL: 18.2, armR: 17.4, legL: 18.3, legR: 18.2 },
    segMuscle: { trunk: 39.0, armL: 5.0,  armR: 5.1,  legL: 13.1, legR: 13.1 },
    source: "tanita",
  },
  {
    // Post-layoff scan. ~5 weeks without training between this and Jul 16.
    // The signature is textbook detraining: scale weight down 1.3 kg, but that
    // is −1.7 kg "muscle" and +0.5 kg fat. Much of the muscle figure is
    // glycogen and its bound water rather than contractile tissue, which is why
    // it returns quickly once training resumes. This is the baseline the
    // restart is measured from.
    date: "2026-09-06",
    weightKg: 98.9,
    bodyFatPct: 21.7,
    fatMassKg: 21.5,
    musclePct: 74.4,
    muscleMassKg: 73.6,
    bodyWaterPct: 53.5,
    bodyWaterKg: 52.9,
    visceralFat: 9,
    bmrKcal: 2282,
    segFat:    { trunk: 24.4, armL: 18.7, armR: 19.3, legL: 18.6, legR: 18.0 },
    segMuscle: { trunk: 38.4, armL: 4.8,  armR: 4.7,  legL: 12.8, legR: 12.9 },
    source: "tanita",
  },
];
