import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { colors } from '../../theme/colors';
import { upsertFarm } from '../../lib/advisory';
import type { AdvisoryStackParamList } from '../../navigation/AdvisoryNavigator';
import { supabase } from '../../lib/supabase';

type R = RouteProp<AdvisoryStackParamList, 'FarmForm'>;

export default function FarmFormScreen() {
  const route = useRoute<R>();
  const id = route.params?.id;
  const nav = useNavigation<any>();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [area, setArea] = useState<string>('');
  const [irrigation, setIrrigation] = useState('');

  const { data } = useQuery({
    queryKey: ['farm', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('farms').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setName(data.name ?? '');
      setLocation(data.location ?? '');
      setArea(data.total_area_ha ?? '');
      setIrrigation(data.irrigation ?? '');
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: upsertFarm,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmsWithPlots'] });
      nav.goBack();
    },
    onError: (e: any) => Alert.alert('Save failed', e.message ?? 'Could not save farm'),
  });

  const onSave = () => {
    if (!name.trim()) return Alert.alert('Missing name', 'Please enter farm name.');
    mut.mutate({
      id,
      name: name.trim(),
      location: location.trim() || null,
      total_area_ha: area ? Number(area) : null,
      irrigation: irrigation.trim() || null,
    } as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '800' }}>{id ? 'Edit Farm' : 'New Farm'}</Text>

      <Field label="Name">
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Beer Hage Farm" style={input} />
      </Field>

      <Field label="Location">
        <TextInput value={location} onChangeText={setLocation} placeholder="Mogadishu" style={input} />
      </Field>

      <Field label="Total area (ha)">
        <TextInput value={area} onChangeText={setArea} placeholder="20" keyboardType="numeric" style={input} />
      </Field>

      <Field label="Irrigation">
        <TextInput value={irrigation} onChangeText={setIrrigation} placeholder="drip / sprinkler / flood" style={input} />
      </Field>

      <TouchableOpacity
        onPress={onSave}
        style={{ marginTop: 18, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
      >
        <Text style={{ color: '#fff', fontWeight: '800' }}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ marginBottom: 6, fontWeight: '700' }}>{label}</Text>
      {children}
    </View>
  );
}

const input = {
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 10,
  padding: 12,
  backgroundColor: '#fff',
} as const;
