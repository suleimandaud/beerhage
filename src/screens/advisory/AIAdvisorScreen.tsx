// src/screens/Advisory/AIAdvisorScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { colors } from '../../theme/colors';
import {
  type Soil,
  type Irrig,
  type CropRec,
  type WeatherSnap,
  recommendCrops,
} from '../../lib/ai/advisor';
import { supabase } from '../../lib/supabase';

export default function AIAdvisorScreen() {
  const [soil, setSoil] = useState<Soil>('loam');
  const [irrig, setIrrig] = useState<Irrig>('drip');
  const [seed, setSeed] = useState<string>('maize');
  const [area, setArea] = useState('');
  const [coords, setCoords] = useState<{ lat?: number; lon?: number }>({});
  const [weather, setWeather] = useState<WeatherSnap>({});
  const [busy, setBusy] = useState(false);
  const [recs, setRecs] = useState<CropRec[]>([]);

  // ---------- LOCATION + WEATHER ----------
  useEffect(() => {
    (async () => {
      setBusy(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const lat = +loc.coords.latitude.toFixed(4);
          const lon = +loc.coords.longitude.toFixed(4);
          setCoords({ lat, lon });

          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation`;
          const weatherRes = await fetch(weatherUrl);
          const js = await weatherRes.json();
          const cur = js.current || {};
          setWeather({
            tempC: cur.temperature_2m,
            rh: cur.relative_humidity_2m,
            rainMm: cur.precipitation,
          });
        } else {
          Alert.alert('Permission Denied', 'Location access is required for AI advisory.');
        }
      } catch (error) {
        console.error('Location or weather error:', error);
        Alert.alert('Error', 'Failed to get location or weather info.');
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  // ---------- MAIN AI LOGIC ----------
  const run = async () => {
    const areaHa = area ? Number(area) : undefined;
    setBusy(true);

    const prompt = `Given the following farm conditions:
- Soil: ${soil}
- Irrigation: ${irrig}
- Area: ${areaHa ?? 'not specified'} ha
- Weather: ${weather.tempC ?? '-'}°C, ${weather.rh ?? '-'}% RH, ${weather.rainMm ?? '-'}mm rain
- Seed: ${seed}

Provide an analysis for this seed: Is it suitable under these conditions?
If suitable, return fit percentage, reasons, sowing window, and irrigation plan.
If unsuitable, suggest 2 alternative crops that fit better.
Return valid JSON array with keys: crop, fit, reason, sowingWindow, irrigationPlan.`;

    try {
      const res = await fetch('https://ovxqseavtfhtabmrafgn.functions.supabase.co/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      let parsed: CropRec[] = [];

      try {
        const content = data?.choices?.[0]?.message?.content;
        if (content && typeof content === 'string') {
          try {
            // ✅ Extract only the JSON part even if the AI returns text or markdown
            const match = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (match) {
              parsed = JSON.parse(match[0]);
            } else {
              throw new Error('No JSON structure found');
            }
          } catch (err) {
            console.warn('⚠️ AI parse error, fallback used:', err);
            parsed = recommendCrops(
              { soil, irrig, lat: coords.lat, lon: coords.lon, areaHa: areaHa ?? null, seed },
              weather
            );
          }
        } else {
          console.warn('⚠️ Empty AI response, using local fallback.');
          parsed = recommendCrops(
            { soil, irrig, lat: coords.lat, lon: coords.lon, areaHa: areaHa ?? null, seed },
            weather
          );
        }
      } catch (parseErr) {
        console.warn('⚠️ AI parse error, fallback used:', parseErr);
        parsed = recommendCrops(
          { soil, irrig, lat: coords.lat, lon: coords.lon, areaHa: areaHa ?? null, seed },
          weather
        );
      }

      setRecs(parsed);

      // ---------- Save history ----------
      const { data: u } = await supabase.auth.getUser();
      if (u.user?.id) {
        await supabase.from('advice_history').insert({
          user_id: u.user.id,
          lat: coords.lat,
          lon: coords.lon,
          soil,
          irrig,
          seed,
          area_ha: areaHa ?? null,
          weather,
          recommendations: parsed,
        });
      }
    } catch (err) {
      console.error('AI response error:', err);
      Alert.alert('Alert', 'AI response failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // ---------- UI ----------
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '800' }}>AI Advisory</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        {coords.lat
          ? `Lat ${coords.lat}, Lon ${coords.lon} · ${weather.tempC ?? '—'}°C · RH ${weather.rh ?? '—'}% · Rain ${weather.rainMm ?? 0}mm`
          : 'Enable location for localised advice'}
      </Text>

      <Field label="Soil">
        <RowChips value={soil} options={soilOpts} onChange={(v) => setSoil(v as Soil)} />
      </Field>

      <Field label="Irrigation">
        <RowChips value={irrig} options={irrigOpts} onChange={(v) => setIrrig(v as Irrig)} />
      </Field>

      <Field label="Seed you have">
        <RowChips value={seed} options={seedOpts} onChange={setSeed} />
      </Field>

      <Field label="Area (ha) – optional">
        <TextInput
          value={area}
          onChangeText={setArea}
          placeholder="e.g. 2.5"
          keyboardType="decimal-pad"
          style={input}
        />
      </Field>

      <TouchableOpacity
        onPress={run}
        disabled={busy}
        style={{
          marginTop: 16,
          backgroundColor: colors.primary,
          paddingVertical: 12,
          borderRadius: 12,
          alignItems: 'center',
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: '800' }}>Get Recommendations</Text>
        )}
      </TouchableOpacity>

      {!!recs.length && (
        <View style={{ marginTop: 16, gap: 12 }}>
          {recs.map((r, i) => (
            <View
              key={`${r.crop}-${i}`}
              style={{
                backgroundColor: '#fff',
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800' }}>
                {(r.crop ?? 'Unknown Crop')} · {(r.fit ?? 0)}% fit
              </Text>
              <Text style={{ color: '#6b7280', marginTop: 4 }}>
                {typeof r.reason === 'string' ? r.reason : 'No reason available'}
              </Text>
              <Text style={{ marginTop: 8, fontWeight: '700' }}>Sowing window</Text>
              <Text style={{ color: '#374151' }}>
                {typeof r.sowingWindow === 'string' ? r.sowingWindow : '—'}
              </Text>
              <Text style={{ marginTop: 8, fontWeight: '700' }}>Irrigation plan</Text>
              <Text style={{ color: '#374151' }}>
                {typeof r.irrigationPlan === 'string' ? r.irrigationPlan : '—'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ---------- Helpers ----------
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ marginBottom: 6, fontWeight: '700' }}>{label}</Text>
      {children}
    </View>
  );
}

function RowChips({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { key: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: active ? colors.primary : '#E8F5E9',
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
            }}
          >
            <Text style={{ color: active ? '#fff' : colors.primary, fontWeight: '700' }}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const soilOpts = [
  { key: 'sandy', label: 'Sandy' },
  { key: 'loam', label: 'Loam' },
  { key: 'clay', label: 'Clay' },
  { key: 'silty', label: 'Silty' },
];

const irrigOpts = [
  { key: 'none', label: 'None' },
  { key: 'drip', label: 'Drip' },
  { key: 'sprinkler', label: 'Sprinkler' },
  { key: 'flood', label: 'Flood' },
];

const seedOpts = [
  { key: 'maize', label: 'Maize' },
  { key: 'sorghum', label: 'Sorghum' },
  { key: 'sesame', label: 'Sesame' },
  { key: 'tomato', label: 'Tomato' },
  { key: 'onion', label: 'Onion' },
];

const input = {
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 10,
  padding: 12,
  backgroundColor: '#fff',
} as const;
