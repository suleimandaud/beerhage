// src/screens/AdvisoryScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import AdvisoryNavigator from '../navigation/AdvisoryNavigator';
import { useSession } from '../lib/session';
import { colors } from '../theme/colors';

export default function AdvisoryScreen() {
  const { user } = useSession();
  const nav = useNavigation<any>();

  // Not signed in → simple CTA
  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '800' }}>Advisory</Text>
          <Text style={{ marginTop: 8, color: '#6b7280' }}>
            Please sign in to manage your farms and plots.
          </Text>

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
            <Text style={{ color: '#fff', fontWeight: '800' }}>
              Sign in / Create account
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Signed in → show the stack (FarmList → FarmForm → PlotForm)
  return <AdvisoryNavigator />;
}
