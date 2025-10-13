import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, Switch } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useUser } from '../lib/useUser';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
    ProductForm: { product?: any };
};

type Props = NativeStackScreenProps<RootStackParamList, 'ProductForm'>;

export default function ProductForm({ route, navigation }: Props) {
    const editingProduct = route?.params?.product ?? null;
    const { user, role } = useUser();

    const [name, setName] = useState(editingProduct?.name ?? '');
    const [price, setPrice] = useState(editingProduct?.price?.toString() ?? '');
    const [unit, setUnit] = useState(editingProduct?.unit ?? '');
    const [stock, setStock] = useState(editingProduct?.stock?.toString() ?? '');
    const [isActive, setIsActive] = useState(editingProduct?.is_active ?? true);

    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async () => {
            const payload = {
                name,
                price: parseFloat(price),
                unit,
                stock: parseInt(stock),
                is_active: isActive,
            };

            if (editingProduct) {
                const { error } = await supabase
                    .from('products')
                    .update(payload)
                    .eq('id', editingProduct.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('products').insert({
                    ...payload,
                    owner_id: user.id,
                    is_active: true,
                });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            navigation.goBack();
        },

        onError: (err) => Alert.alert('Error', err.message),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', editingProduct.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            navigation.goBack();
        },

        onError: (err) => Alert.alert('Delete Failed', err.message),
    });

    return (
        <View style={{ padding: 20 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 12 }}>
                {editingProduct ? 'Edit Product' : 'Add Product'}
            </Text>

            <Text>Name</Text>
            <TextInput
                value={name}
                onChangeText={setName}
                style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
            />

            <Text>Price</Text>
            <TextInput
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
            />

            <Text>Unit (e.g. kg)</Text>
            <TextInput
                value={unit}
                onChangeText={setUnit}
                style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
            />

            <Text>Stock</Text>
            <TextInput
                value={stock}
                onChangeText={setStock}
                keyboardType="numeric"
                style={{ borderWidth: 1, marginBottom: 20, padding: 8 }}
            />

            {editingProduct && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <Text style={{ marginRight: 12 }}>Active:</Text>
                    <Switch value={isActive} onValueChange={setIsActive} />
                </View>
            )}

            <Button
                title={mutation.isPending ? 'Saving…' : editingProduct ? 'Update' : 'Save'}
                onPress={() => mutation.mutate()}
                disabled={mutation.isPending}
            />

            {editingProduct && (
                <View style={{ marginTop: 16 }}>
                    <Button
                        title="Delete"
                        color="red"
                        onPress={() => {
                            Alert.alert('Delete Product', 'Are you sure?', [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: () => deleteMutation.mutate(),
                                },
                            ]);
                        }}
                    />
                </View>
            )}
        </View>
    );
}
