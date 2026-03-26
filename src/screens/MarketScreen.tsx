import React from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useUser } from '../lib/useUser';
import ProductCard from '../components/ProductCard';
import { colors } from '../theme/colors';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  MarketScreen: undefined;
  ProductForm: { product?: any };
  ProductDetails: { product: any };
};

type Props = NativeStackScreenProps<RootStackParamList, 'MarketScreen'>;

async function fetchProducts(role: string, userId: string) {
  let q = supabase.from('products').select('*').order('id', { ascending: false });

  if (role === 'farmer') q = q.eq('is_active', true);
  if (role === 'company') q = q.eq('company_user', userId);
  // admin => all

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export default function MarketScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, role, loading: userLoading } = useUser();

  const userId = user?.id ?? '';
  const enabled = !userLoading && !!role && !!userId;

  const {
    data: products = [],
    isLoading,
    refetch,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['products', role, userId],
    queryFn: () => fetchProducts(role!, userId),
    enabled,
  });

  const canAdd = role === 'company'; // ✅ admin can’t create

  // Loading guard
  if (userLoading || !user || !role) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.muted, marginTop: 8 }}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.text, marginBottom: 8 }}>Error loading products.</Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            paddingTop: Math.max(insets.top, 10),
            paddingHorizontal: 16,
            paddingBottom: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.bg,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary }}>Marketplace</Text>

          {canAdd && (
            <TouchableOpacity
              onPress={() => navigation.navigate('ProductForm', {})}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 10,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>+ Add</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom }}
          data={products}
          keyExtractor={(item: any) => String(item.id)}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
          renderItem={({ item }: any) => (
            <ProductCard
              product={item}
              user={user}
              role={role}
              onPress={() => {
                const isOwner = item.company_user === user.id;
                if ((role === 'company' && isOwner) || role === 'admin') {
                  navigation.navigate('ProductForm', { product: item });
                } else {
                  navigation.navigate('ProductDetails', { product: item });
                }
              }}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: colors.muted, fontSize: 15 }}>No products found.</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
