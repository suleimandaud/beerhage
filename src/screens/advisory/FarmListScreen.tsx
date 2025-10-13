import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { deleteFarm, deletePlot, listFarmsWithPlots } from '../../lib/advisory';
import type { AdvisoryStackParamList } from '../../navigation/AdvisoryNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<AdvisoryStackParamList, 'FarmList'>;

export default function FarmListScreen() {
  const nav = useNavigation<Nav>();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['farmsWithPlots'],
    queryFn: listFarmsWithPlots,
  });

  const mDelFarm = useMutation({
    mutationFn: deleteFarm,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['farmsWithPlots'] }),
  });

  const mDelPlot = useMutation({
    mutationFn: deletePlot,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['farmsWithPlots'] }),
  });

  const askDelFarm = (id: string) =>
    Alert.alert('Delete farm?', 'This will remove the farm and all its plots.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => mDelFarm.mutate(id) },
    ]);

  const askDelPlot = (id: string) =>
    Alert.alert('Delete plot?', 'This will remove the plot permanently.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => mDelPlot.mutate(id) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          padding: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '800' }}>Your Farms</Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => nav.navigate('AIAdvisor')}
            style={{
              backgroundColor: '#E8F5E9',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: '800' }}>AI Advisor</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => nav.navigate('FarmForm')}
            style={{
              backgroundColor: colors.primary,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>Add Farm</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <Text style={{ padding: 16 }}>Loading…</Text>
      ) : error ? (
        <Text style={{ padding: 16, color: 'red' }}>{String((error as any).message || error)}</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item: f }) => (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800' }}>{f.name}</Text>
                  <Text style={{ color: '#6b7280' }}>
                    {f.location || '—'} · {f.total_area_ha ?? '—'} ha · {f.irrigation || '—'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <IconBtn onPress={() => nav.navigate('FarmForm', { id: f.id })} icon="pencil-outline" />
                  <IconBtn onPress={() => askDelFarm(f.id)} icon="trash-can-outline" danger />
                </View>
              </View>

              {/* plots */}
              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700' }}>Plots</Text>
                  <TouchableOpacity
                    onPress={() => nav.navigate('PlotForm', { farm_id: f.id })}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 999,
                      backgroundColor: '#E8F5E9',
                    }}
                  >
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>Add plot</Text>
                  </TouchableOpacity>
                </View>

                {f.plots?.length ? (
                  f.plots.map((p) => (
                    <View
                      key={p.id}
                      style={{
                        marginTop: 8,
                        padding: 10,
                        borderRadius: 12,
                        backgroundColor: '#F9FAFB',
                        borderWidth: 1,
                        borderColor: colors.border,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700' }}>{p.name}</Text>
                        <Text style={{ color: '#6b7280' }}>
                          {p.area_ha ?? '—'} ha · {p.crop || '—'}
                        </Text>
                        {p.notes ? <Text style={{ color: '#6b7280' }}>{p.notes}</Text> : null}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <IconBtn onPress={() => nav.navigate('PlotForm', { farm_id: f.id, id: p.id })} icon="pencil-outline" />
                        <IconBtn onPress={() => askDelPlot(p.id)} icon="trash-can-outline" danger />
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={{ marginTop: 6, color: '#6b7280' }}>No plots yet.</Text>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function IconBtn({
  onPress,
  icon,
  danger,
}: {
  onPress: () => void;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: danger ? '#fee2e2' : '#eef2ff',
      }}
    >
      <MaterialCommunityIcons name={icon} size={20} color={danger ? '#b91c1c' : '#1f2937'} />
    </TouchableOpacity>
  );
}
