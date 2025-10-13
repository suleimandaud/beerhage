import React from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useUser } from '../lib/useUser';
import ProductCard from '../components/ProductCard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  MarketScreen: undefined;
  ProductForm: { product: any };
  ProductDetails: { product: any };
};

type Props = NativeStackScreenProps<RootStackParamList, 'MarketScreen'>;

const fetchProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: false });

  if (error) throw error;
  return data;
};

export default function MarketScreen({ navigation }: Props) {
  const { user, role } = useUser();

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  if (!role || !user) return null;
  if (isLoading) return <ActivityIndicator />;
  if (error) return <Text>Error: {error.message}</Text>;

  return (
    <FlatList
      contentContainerStyle={{ padding: 16 }}
      data={products}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <ProductCard
          product={item}
          user={user}

          onPress={() => {
            if (role === 'company' && item.owner_id === user.id) {
              navigation.navigate('ProductForm', { product: item });
            } else {
              navigation.navigate('ProductDetails', { product: item });
            }
          } } role={'company'}        />
      )}
    />
  );
}
