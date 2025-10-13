import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { localNotify } from '../lib/session';
import { useNavigation } from '@react-navigation/native';

type Weather = { temp?: number; humidity?: number; rain?: number };

export default function HomeScreen() {
  const { t, i18n } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const [lang, setLang] = useState<'en' | 'so' | 'ar'>(i18n.language as any);
  const [coords, setCoords] = useState<{ lat?: number; lon?: number }>({});
  const [place, setPlace] = useState<string | undefined>();
  const [weather, setWeather] = useState<Weather>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rainNotified = useRef(false);
  const nav = useNavigation<any>();

  const switchLang = async (lng: 'en' | 'so' | 'ar') => { setLang(lng); await i18n.changeLanguage(lng); };

  const fetchLocationAndWeather = useCallback(async () => {
    setErr(null); setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setErr('Location permission denied'); setLoading(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = +loc.coords.latitude.toFixed(4);
      const lon = +loc.coords.longitude.toFixed(4);
      setCoords({ lat, lon });
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        const g = geo?.[0];
        setPlace(g ? (g.city ?? g.region ?? g.country ?? undefined) : undefined);
      } catch {}
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation`;
      const res = await fetch(url); const js = await res.json(); const cur = js.current || {};
      const w: Weather = { temp: cur.temperature_2m, humidity: cur.relative_humidity_2m, rain: cur.precipitation };
      setWeather(w);
      if (!rainNotified.current && typeof w.rain === 'number' && w.rain > 0) {
        rainNotified.current = true; await localNotify('Weather alert', 'Rain detected — delay irrigation today.');
      }
    } catch (e: any) { setErr(e?.message ?? 'Failed to get weather'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchLocationAndWeather(); }, [fetchLocationAndWeather]);

  const irrigationTip = (() => {
    const t = weather.temp ?? NaN, h = weather.humidity ?? NaN, r = weather.rain ?? 0;
    if (r > 0) return 'Rain today — delay irrigation.';
    if (!Number.isNaN(t) && t >= 35) return 'High temp — increase water ~20%.';
    if (!Number.isNaN(h) && h >= 70) return 'High humidity — reduce water slightly.';
    if (!Number.isNaN(t) && t <= 18) return 'Cool conditions — light irrigation.';
    return 'Conditions normal.';
  })();

  return (
    // use insets.top to push content below status bar (no overlap)
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }} edges={['left','right']}>
      {/* On Android, translucent=false prevents overlay */}
      <StatusBar style="dark" translucent={false} backgroundColor={colors.bg} />

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchLocationAndWeather} />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>{t('appName')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['en','so','ar'] as const).map(code => (
              <TouchableOpacity
                key={code}
                onPress={() => switchLang(code)}
                style={{
                  paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999,
                  backgroundColor: lang === code ? colors.primary : '#E8F5E9',
                }}>
                <Text style={{ color: lang === code ? '#fff' : colors.primary, fontWeight: '700' }}>
                  {code.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Search */}
        <View style={{
          marginTop: 12, backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 12,
          borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center'
        }}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput
            placeholder={t('searchPlaceholder')}
            style={{ flex: 1, paddingVertical: 12, marginLeft: 8 }}
            returnKeyType="search"
          />
        </View>

        {/* Weather / GPS */}
        <View style={{
          marginTop: 14, backgroundColor: colors.card, borderRadius: 16, padding: 14,
          borderWidth: 1, borderColor: colors.border
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="weather-partly-cloudy" size={36} color={colors.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>{t('weatherToday')}</Text>
              {coords.lat ? (
                <Text style={{ color: colors.muted }}>
                  {place ? `${place} · ` : ''}
                  {coords.lat}, {coords.lon} — {weather.temp ?? '—'}°C · RH {weather.humidity ?? '—'}% · Rain {weather.rain ?? 0}mm
                </Text>
              ) : <Text style={{ color: colors.muted }}>{t('enableLocation')}</Text>}
            </View>
            {loading && <ActivityIndicator />}
          </View>

          {/* Irrigation tip */}
          <View style={{
            marginTop: 10, backgroundColor: '#E8F5E9', borderRadius: 12,
            paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8
          }}>
            <MaterialCommunityIcons name="watering-can-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '600' }}>{irrigationTip}</Text>
          </View>

          {err && (
            <TouchableOpacity onPress={fetchLocationAndWeather}
              style={{ marginTop: 10, backgroundColor: '#FFF4F2', borderColor: '#FECACA',
                       borderWidth: 1, borderRadius: 10, padding: 10 }}>
              <Text style={{ color: '#B91C1C', fontWeight: '700' }}>Location/Weather error</Text>
              <Text style={{ color: '#B91C1C' }}>{err}</Text>
              <Text style={{ color: '#B91C1C', marginTop: 4, textDecorationLine: 'underline' }}>Tap to try again</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick actions */}
        <Text style={{ marginTop: 18, marginBottom: 8, fontSize: 16, fontWeight: '700' }}>{t('quickActions')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[
            { key: 'Advisory', icon: 'sprout-outline' as const },
            { key: 'Market',   icon: 'storefront-outline' as const },
            { key: 'Community',icon: 'account-group-outline' as const },
            { key: 'Analytics',icon: 'chart-line' as const },
          ].map(item => (
            <TouchableOpacity
              key={item.key}
              onPress={() => nav.navigate(item.key)}
              style={{
                width: '47.8%', backgroundColor: colors.card, borderRadius: 16, paddingVertical: 18,
                alignItems: 'center', borderWidth: 1, borderColor: colors.border
              }}>
              <MaterialCommunityIcons name={item.icon} size={28} color={colors.primary} />
              <Text style={{ marginTop: 6, fontWeight: '600' }}>{t(item.key.toLowerCase() as any)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
