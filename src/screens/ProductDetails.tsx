import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { colors } from '../theme/colors';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  ProductDetails: { product: any };
};

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetails'>;

export default function ProductDetails({ route }: Props) {
  const { product } = route.params;

  const images: string[] = Array.isArray(product.images) ? product.images : [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary }}>
        {product.name}
      </Text>

      {images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {images.map((url, idx) => (
            <Image
              key={String(idx)}
              source={{ uri: url }}
              style={{ width: 240, height: 160, borderRadius: 12, marginRight: 10 }}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

      {!!product.description && (
        <Text style={{ color: colors.text, marginTop: 12 }}>{product.description}</Text>
      )}

      <View
        style={{
          marginTop: 16,
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontWeight: '700', color: colors.text }}>
          Price: {product.price} / {product.unit}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>
          Stock Available: {product.stock}
        </Text>
      </View>

      <TouchableOpacity
        style={{
          marginTop: 24,
          backgroundColor: colors.primary,
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: 'center',
        }}
        onPress={() => alert('Cart/Checkout flow coming soon')}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Buy Now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
