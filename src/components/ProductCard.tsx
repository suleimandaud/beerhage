import React from 'react';
import { View, Text, Button } from 'react-native';

type Product = {
  id: number;
  name: string;
  price: number;
  unit: string;
  stock: number;
  owner_id: string;
};

type User = {
  id: string;
};

type UserRole = 'admin' | 'company' | 'farmer';

type ProductCardProps = {
  product: Product;
  user: User;
  role: UserRole;
  onPress: () => void;
};

export default function ProductCard({ product, user, role, onPress }: ProductCardProps) {
  const isOwner = product.owner_id === user?.id;

  return (
    <View style={{
      borderWidth: 1,
      borderColor: '#e5e7eb',
      padding: 12,
      marginBottom: 16,
      borderRadius: 8,
      backgroundColor: '#fff'
    }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>{product.name}</Text>
      <Text style={{ color: '#374151' }}>{product.price} / {product.unit}</Text>
      <Text style={{ color: '#6b7280', marginBottom: 8 }}>Stock: {product.stock}</Text>

      {role === 'admin' && (
        <Button title="Manage" onPress={onPress} />
      )}

      {role === 'company' && isOwner && (
        <Button title="Edit" onPress={onPress} />
      )}

      {(role === 'farmer' || (role === 'company' && !isOwner)) && (
        <Button title="Buy" onPress={onPress} />
      )}
    </View>
  );
}
