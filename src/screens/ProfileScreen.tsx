import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { supabase } from '../lib/supabase';
import { useSession } from '../lib/session';
import { colors } from '../theme/colors';
import { useTranslation } from 'react-i18next';

// Types

type Role = 'farmer' | 'company' | 'admin';
type Lang = 'en' | 'so' | 'ar';

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: Role | null;
  lang: Lang | null;
  avatar_url: string | null;
};

async function fetchProfile(uid: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export default function ProfileScreen() {
  const { user } = useSession();
  const uid = user?.id ?? null;
  const email = user?.email ?? '';
  const nav = useNavigation<any>();

  const { t, i18n } = useTranslation('common');
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', uid],
    queryFn: () => fetchProfile(uid!),
    enabled: !!uid,
  });

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('farmer');
  const [lang, setLang] = useState<Lang>('en');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setRole((profile.role as Role) ?? 'farmer');
      setLang((profile.lang as Lang) ?? 'en');
      setAvatarUrl(profile.avatar_url ?? undefined);
    }
  }, [profile]);

  const save = async () => {
    if (!uid) return;
    try {
      setSaving(true);
      const patch = {
        id: uid,
        full_name: fullName.trim(),
        phone: phone.trim(),
        role,
        lang,
        avatar_url: avatarUrl ?? null,
      };
      const { error } = await supabase.from('profiles').upsert(patch);
      if (error) throw error;

      await qc.invalidateQueries({ queryKey: ['profile', uid] });
      if (i18n.language !== lang) await i18n.changeLanguage(lang);
      Alert.alert(t('profile.saved'), t('profile.profileUpdated'));
    } catch (e: any) {
      Alert.alert(t('profile.error'), e.message ?? t('profile.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async () => {
    if (!uid) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('profile.permissionNeeded'), t('profile.allowLibraryAccess'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (res.canceled) return;

    try {
      const asset = res.assets[0];
      const uri = asset.uri;
      const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
      const path = `${uid}/avatar.${ext}`;

      const file = await (await fetch(uri)).blob();
      const { error } = await supabase.storage
        .from('media')
        .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
      if (error) throw error;

      const { data } = supabase.storage.from('media').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      Alert.alert(t('profile.avatarUpdated'), t('profile.pressSaveNote'));
    } catch (e: any) {
      Alert.alert(t('profile.uploadFailed'), e.message ?? t('profile.couldNotUpload'));
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (!uid) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '800' }}>{t('profile.title')}</Text>
          <Text style={{ marginTop: 8, color: colors.muted }}>{t('profile.signedOutCta')}</Text>

          <TouchableOpacity
            onPress={() => nav.navigate('Auth')}
            style={{
              marginTop: 16,
              backgroundColor: colors.primary,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>{t('profile.signInButton')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800' }}>{t('profile.title')}</Text>

        <View style={{ marginTop: 12 }}>
          <Text style={{ marginBottom: 6, fontWeight: '700' }}>{t('profile.email')}</Text>
          <View
            style={{
              ...inputStyle,
              backgroundColor: '#F9FAFB',
              borderStyle: 'dashed',
            }}
          >
            <Text style={{ color: '#4B5563' }}>{email}</Text>
          </View>
        </View>

        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <TouchableOpacity onPress={pickAvatar} style={{ alignItems: 'center' }}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 100, height: 100, borderRadius: 50 }} />
            ) : (
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: '#E8F5E9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <MaterialCommunityIcons name="account-circle-outline" size={60} color={colors.primary} />
              </View>
            )}
            <Text style={{ marginTop: 8, color: colors.primary, fontWeight: '700' }}>{t('profile.changePhoto')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 16, gap: 12 }}>
          <Field label={t('profile.fullName')}>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('profile.fullName')}
              style={inputStyle}
            />
          </Field>

          <Field label={t('profile.phone')}>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+252..."
              keyboardType="phone-pad"
              style={inputStyle}
            />
          </Field>

          <Field label={t('profile.role')}>
            <RowChips
              value={role}
              options={[
                { key: 'farmer', label: t('profile.roleFarmer') },
                { key: 'company', label: t('profile.roleCompany') },
                { key: 'admin', label: t('profile.roleAdmin') },
              ]}
              onChange={(v) => setRole(v as Role)}
            />
          </Field>

          <Field label={t('profile.language')}>
            <RowChips
              value={lang}
              options={[
                { key: 'en', label: 'EN' },
                { key: 'so', label: 'SO' },
                { key: 'ar', label: 'AR' },
              ]}
              onChange={(v) => setLang(v as Lang)}
            />
          </Field>
        </View>

        <View style={{ marginTop: 20, gap: 10 }}>
          <TouchableOpacity
            onPress={save}
            disabled={saving}
            style={{
              backgroundColor: colors.primary,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>
              {saving ? t('profile.saving') : t('profile.save')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={signOut}
            style={{
              backgroundColor: '#F3F4F6',
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: '#111827', fontWeight: '800' }}>{t('profile.signOut')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
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
    <View style={{ flexDirection: 'row', gap: 8 }}>
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

const inputStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 10,
  padding: 12,
  backgroundColor: '#fff',
} as const;
