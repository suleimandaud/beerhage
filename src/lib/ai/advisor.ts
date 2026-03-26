// src/lib/ai/advisor.ts
export type Soil = 'sandy' | 'loam' | 'clay' | 'silty';
export type Irrig = 'none' | 'drip' | 'sprinkler' | 'flood';
export type Season = 'Jilaal' | 'Gu' | 'Karan' | 'Deyr';

export type WeatherSnap = {
  tempC?: number;      // current °C
  rh?: number;         // %
  rainMm?: number;     // precipitation last/current day mm
};

export type Inputs = {
  lat?: number;
  lon?: number;
  soil: Soil;
  irrig: Irrig;
  seed?: string | null; // ✅ New
  areaHa?: number | null;
  month?: number; // 1..12 (fallback if GPS not available)
};

export type CropRec = {
  crop: string;
  reason: string;
  fit: number; // 0..100
  sowingWindow: string; // text
  irrigationPlan: string; // text
};

// Somali seasons (simplified)
export function seasonFromMonth(m: number): Season {
  if ([1,2,3].includes(m)) return 'Jilaal';
  if ([4,5,6].includes(m)) return 'Gu';
  if ([7,8,9].includes(m)) return 'Karan';
  return 'Deyr'; // 10,11,12
}

// Mini crop knowledge base
const CATALOG = [
  {
    crop: 'Maize',
    seasons: ['Gu','Deyr'] as Season[],
    soils: ['loam','sandy'] as Soil[],
    water: 'medium' as const,
    tempRange: [18, 34] as [number, number],
    notes: 'Staple crop; avoid waterlogging; prefers 400–700 mm over season.'
  },
  {
    crop: 'Sorghum',
    seasons: ['Gu','Karan','Deyr'] as Season[],
    soils: ['sandy','loam','clay'] as Soil[],
    water: 'low' as const,
    tempRange: [20, 38] as [number, number],
    notes: 'Drought tolerant; good for low rainfall areas.'
  },
  {
    crop: 'Sesame',
    seasons: ['Gu','Deyr'] as Season[],
    soils: ['sandy','loam'] as Soil[],
    water: 'low' as const,
    tempRange: [20, 35] as [number, number],
    notes: 'Sensitive to waterlogging; good market price.'
  },
  {
    crop: 'Tomato',
    seasons: ['Gu','Karan'] as Season[],
    soils: ['loam','silty'] as Soil[],
    water: 'high' as const,
    tempRange: [18, 30] as [number, number],
    notes: 'Needs regular irrigation; sensitive to extreme heat >35°C.'
  },
  {
    crop: 'Onion',
    seasons: ['Karan','Deyr'] as Season[],
    soils: ['loam','sandy'] as Soil[],
    water: 'medium' as const,
    tempRange: [15, 30] as [number, number],
    notes: 'Uniform moisture needed; avoid heavy clay.'
  },
];

function scoreCrop(
  season: Season,
  soil: Soil,
  irrig: Irrig,
  w: WeatherSnap,
  spec: typeof CATALOG[number]
): {fit: number; why: string[]} {
  let fit = 50;
  const why: string[] = [];

  // Season match
  if (spec.seasons.includes(season)) { fit += 20; why.push(`Fits ${season} season`); }
  else { fit -= 10; why.push(`Less ideal in ${season}`); }

  // Soil
  if (spec.soils.includes(soil)) { fit += 15; why.push(`Good for ${soil} soil`); }
  else { fit -= 10; why.push(`Not ideal for ${soil} soil`); }

  // Temperature
  if (typeof w.tempC === 'number') {
    const [tmin, tmax] = spec.tempRange;
    if (w.tempC >= tmin && w.tempC <= tmax) {
      fit += 10;
      why.push(`Temp ${w.tempC}°C within ${tmin}–${tmax}°C`);
    } else {
      fit -= 8;
      why.push(`Temp ${w.tempC}°C outside ${tmin}–${tmax}°C range`);
    }
  }

  // Water need vs irrigation + rain
  const rain = w.rainMm ?? 0;
  const waterNeed = spec.water;
  if (waterNeed === 'low') {
    if (irrig === 'none' || rain > 2) { fit += 8; why.push('Low water need suits your setup'); }
  } else if (waterNeed === 'medium') {
    if (irrig === 'drip' || irrig === 'sprinkler' || rain > 2) { fit += 6; why.push('Medium water need covered by drip/sprinkler or rain'); }
    else { fit -= 5; why.push('Consider drip or schedule irrigation'); }
  } else { // high
    if (irrig === 'drip' || irrig === 'sprinkler') { fit += 8; why.push('High water need covered by your irrigation'); }
    else { fit -= 8; why.push('Needs reliable irrigation (drip/sprinkler)'); }
  }

  fit = Math.max(0, Math.min(100, fit));
  return { fit, why };
}

function irrigationPlanText(irrig: Irrig, waterNeed: 'low'|'medium'|'high', rh?: number) {
  const humidity = rh ?? 60;
  const base = waterNeed === 'low' ? 2 : waterNeed === 'medium' ? 4 : 6;
  const adj = humidity > 75 ? -1 : humidity < 40 ? +1 : 0;
  const mmDay = Math.max(1, base + adj);

  if (irrig === 'none')
    return `Plan for rainfall only. Target ~${mmDay} mm/day equivalent by timing sowing with rainy weeks. Mulch to retain moisture.`;
  if (irrig === 'drip')
    return `Drip: ${mmDay}–${mmDay+1} mm/day split into 1–2 runs. Keep soil evenly moist; add fertigation weekly.`;
  if (irrig === 'sprinkler')
    return `Sprinkler: ${mmDay+1}–${mmDay+2} mm/day; avoid mid-day heat; watch leaf wetness for disease.`;
  return `Flood: ${mmDay+2}–${mmDay+3} mm/day equivalent; ensure drainage to avoid waterlogging.`;
}

export function recommendCrops(inputs: Inputs, weather: WeatherSnap): CropRec[] {
  const m = inputs.month ?? new Date().getMonth() + 1;
  const season = seasonFromMonth(m);
  const { soil, irrig, seed } = inputs;

  const scored = CATALOG.map((c) => {
    const s = scoreCrop(season, soil, irrig, weather, c);
    const sow =
      season === 'Gu' ? 'Early April–May' :
      season === 'Karan' ? 'July–August' :
      season === 'Deyr' ? 'Oct–Nov' : 'Late Jan–Feb';

    return {
      crop: c.crop,
      reason: `${s.why.join('; ')}. ${c.notes}`,
      fit: s.fit,
      sowingWindow: sow,
      irrigationPlan: irrigationPlanText(irrig, c.water as any, weather.rh),
    } as CropRec;
  });

  const sorted = scored.sort((a,b) => b.fit - a.fit);

  // ✅ If a seed is provided, evaluate it first
  if (seed) {
    const match = sorted.find(c => c.crop.toLowerCase() === seed.toLowerCase());
    if (match) {
      const alternatives = sorted.filter(c => c.crop !== match.crop).slice(0, 2);
      return [match, ...alternatives];
    }
  }

  return sorted.slice(0, 5);
}
