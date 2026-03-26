// src/components/ProductCard.tsx
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { colors } from '../theme/colors';

export default function ProductCard({ product, user, role, onPress }: any) {
  const isOwner = product.company_user === user?.id;

  const buttonText = role === 'admin'
    ? 'Manage'
    : role === 'company' && isOwner
      ? 'Edit'
      : 'Buy';

  const thumb = useMemo(() => {
    const arr = Array.isArray(product?.images) ? product.images : [];
    return arr[0] || null;
  }, [product?.images]);

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {thumb ? (
          <Image
            source={{ uri: thumb }}
            style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: colors.border }}
          />
        ) : (
          <View
            style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: colors.border, opacity: 0.6 }}
          />
        )}

        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: colors.primary }}>
            {product.name}
          </Text>
          <Text style={{ color: colors.text }}>
            {product.price} SOS / {product.unit}
          </Text>
          <Text style={{ color: colors.muted, marginTop: 2 }}>
            Stock: {product.stock}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={{
          marginTop: 12,
          backgroundColor: colors.primary,
          borderRadius: 10,
          paddingVertical: 10,
          alignItems: 'center',
        }}
        onPress={onPress}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
}
