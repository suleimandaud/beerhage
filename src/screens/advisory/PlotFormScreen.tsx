import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { colors } from '../../theme/colors';
import { upsertPlot } from '../../lib/advisory';
import type { AdvisoryStackParamList } from '../../navigation/AdvisoryNavigator';
import { supabase } from '../../lib/supabase';

type R = RouteProp<AdvisoryStackParamList, 'PlotForm'>;

export default function PlotFormScreen() {
  const { params } = useRoute<R>();
  const nav = useNavigation<any>();
  const qc = useQueryClient();

  const { id, farm_id } = params;

  const [name, setName] = useState('');
  const [area, setArea] = useState<string>('');
  const [crop, setCrop] = useState('');
  const [notes, setNotes] = useState('');

  const { data } = useQuery({
    queryKey: ['plot', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('plots').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setName(data.name ?? '');
      setArea(data.area_ha ?? '');
      setCrop(data.crop ?? '');
      setNotes(data.notes ?? '');
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: upsertPlot,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmsWithPlots'] });
      nav.goBack();
    },
    onError: (e: any) => Alert.alert('Save failed', e.message ?? 'Could not save plot'),
  });

  const onSave = () => {
    if (!name.trim()) return Alert.alert('Missing name', 'Please enter plot name.');
    mut.mutate({
      id,
      farm_id,
      name: name.trim(),
      area_ha: area ? Number(area) : null,
      crop: crop.trim() || null,
      notes: notes.trim() || null,
    } as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '800' }}>{id ? 'Edit Plot' : 'New Plot'}</Text>

      <Field label="Name">
        <TextInput value={name} onChangeText={setName} placeholder="e.g. North Field" style={input} />
      </Field>
      <Field label="Area (ha)">
        <TextInput value={area} onChangeText={setArea} placeholder="2.5" keyboardType="numeric" style={input} />
      </Field>
      <Field label="Crop">
        <TextInput value={crop} onChangeText={setCrop} placeholder="Maize / Sorghum / Tomatoes…" style={input} />
      </Field>
      <Field label="Notes">
        <TextInput value={notes} onChangeText={setNotes} placeholder="Soil is sandy loam…" style={[input, { height: 90 }]} multiline />
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
