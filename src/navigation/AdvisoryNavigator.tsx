import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FarmListScreen from '../screens/advisory/FarmListScreen';
import FarmFormScreen from '../screens/advisory/FarmFormScreen';
import PlotFormScreen from '../screens/advisory/PlotFormScreen';
import AIAdvisorScreen from '../screens/advisory/AIAdvisorScreen';

export type AdvisoryStackParamList = {
  FarmList: undefined;
  FarmForm: { id?: string } | undefined; // edit when id provided
  PlotForm: { farm_id: string; id?: string };
  AIAdvisor: undefined;                  // ✅ add this
};

const Stack = createNativeStackNavigator<AdvisoryStackParamList>();

export default function AdvisoryNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="FarmList" component={FarmListScreen} options={{ title: 'Your Farms' }} />
      <Stack.Screen name="FarmForm" component={FarmFormScreen} options={{ title: 'Farm' }} />
      <Stack.Screen name="PlotForm" component={PlotFormScreen} options={{ title: 'Plot' }} />
      <Stack.Screen name="AIAdvisor" component={AIAdvisorScreen} options={{ title: 'AI Advisory' }} />
    </Stack.Navigator>
  );
}
