import React from 'react';
import { View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/session';

async function count(table: string, filter?: { col: string; val: any }) {
  let q = supabase.from(table).select('id', { count: 'exact', head: true });
  if (filter) q = q.eq(filter.col, filter.val);
  const { count } = await q;
  return count ?? 0;
}

export default function AnalyticsScreen() {
  const { user } = useSession();
  const { data: prod = 0 } = useQuery({ queryKey: ['count-products'], queryFn: () => count('products') });
  const { data: posts = 0 } = useQuery({ queryKey: ['count-posts'], queryFn: () => count('posts') });
  const { data: farms = 0 } = useQuery({ queryKey: ['count-farms', user?.id], queryFn: () => count('farms', { col:'owner', val: user!.id }), enabled: !!user?.id });

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '800' }}>Analytics</Text>
      <Card label="Products" value={prod} />
      <Card label="Community Posts" value={posts} />
      <Card label="Your Farms" value={farms} />
    </View>
  );
}

function Card({ label, value }: any) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' }}>
      <Text style={{ color: '#6b7280' }}>{label}</Text>
      <Text style={{ fontSize: 24, fontWeight: '800' }}>{value}</Text>
    </View>
  );
}
