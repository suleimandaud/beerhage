// src/screens/ProductForm.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  Switch,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useUser } from '../lib/useUser';
import { uploadProductImage } from '../lib/uploadProductImage';
import { colors } from '../theme/colors';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  ProductForm: { product?: any };
};

type Props = NativeStackScreenProps<RootStackParamList, 'ProductForm'>;

export default function ProductForm({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const editingProduct = route?.params?.product ?? null;
  const { user, role, loading: userLoading } = useUser();

  const isEdit = !!editingProduct;
  const isCompany = role === 'company';
  const isAdmin = role === 'admin';

  const isOwner = useMemo(() => {
    if (!editingProduct || !user?.id) return false;
    return editingProduct.company_user === user.id;
  }, [editingProduct, user?.id]);

  // rules:
  // create: company only
  // edit/delete: admin any OR company own
  const canCreate = isCompany;
  const canEditThis = isEdit ? (isAdmin || (isCompany && isOwner)) : canCreate;

  const [name, setName] = useState(editingProduct?.name ?? '');
  const [price, setPrice] = useState(editingProduct?.price?.toString?.() ?? '');
  const [unit, setUnit] = useState(editingProduct?.unit ?? '');
  const [stock, setStock] = useState(editingProduct?.stock?.toString?.() ?? '');
  const [isActive, setIsActive] = useState(editingProduct?.is_active ?? true);

  // existing urls (edit) + picked new images (uris)
  const [existingImages, setExistingImages] = useState<string[]>(
    Array.isArray(editingProduct?.images) ? editingProduct.images : []
  );
  const [newImageUris, setNewImageUris] = useState<string[]>([]);

  const removeImage = (img: string) => {
    // if it's an existing URL
    if (existingImages.includes(img)) {
      setExistingImages(prev => prev.filter(x => x !== img));
      return;
    }
    // else it's new local URI
    setNewImageUris(prev => prev.filter(x => x !== img));
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'Media library permission is required.');
      return;
    }

    // ✅ support BOTH versions:
    // - new: ImagePicker.MediaType.Images
    // - old: ImagePicker.MediaTypeOptions.Images
    const mediaTypes =
      (ImagePicker as any).MediaType?.Images ?? (ImagePicker as any).MediaTypeOptions?.Images;

    const res = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: 3,
      mediaTypes,
      quality: 0.8,
    } as any);

    if (res.canceled) return;

    const selected = res.assets.map((a: any) => a.uri);

    // total max 3 (existing + new)
    const total = existingImages.length + newImageUris.length + selected.length;
    if (total > 3) {
      Alert.alert('Limit', 'Max 3 images per product.');
      return;
    }

    setNewImageUris(prev => [...prev, ...selected]);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in');
      if (!role) throw new Error('Role not loaded');

      if (!canEditThis) {
        throw new Error(isEdit ? 'You cannot edit this product.' : 'Only companies can add products.');
      }

      const cleanName = name.trim();
      const cleanUnit = unit.trim();
      const nPrice = Number(price);
      const nStock = Number(stock);

      if (!cleanName) throw new Error('Name is required');
      if (!cleanUnit) throw new Error('Unit is required');
      if (!Number.isFinite(nPrice) || nPrice < 0) throw new Error('Price must be valid');
      if (!Number.isFinite(nStock) || nStock < 0) throw new Error('Stock must be valid');

      // ✅ upload new images and merge with existing
      const uploadedUrls: string[] = [];
      for (const uri of newImageUris) {
        const url = await uploadProductImage(uri, user.id);
        uploadedUrls.push(url);
      }

      const finalImages = [...existingImages, ...uploadedUrls].slice(0, 3);

      const payload = {
        name: cleanName,
        price: nPrice,
        unit: cleanUnit,
        stock: nStock,
        is_active: isActive,
        images: finalImages, // ✅ jsonb array
      };

      if (isEdit) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from('products').insert({
        ...payload,
        company_user: user.id, // ✅ required (NOT NULL)
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      Alert.alert('Success', isEdit ? 'Product updated.' : 'Product added.');
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert('Error', err?.message ?? 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in');
      if (!role) throw new Error('Role not loaded');
      if (!isEdit) throw new Error('Nothing to delete');

      if (!(isAdmin || (isCompany && isOwner))) {
        throw new Error('You cannot delete this product.');
      }

      const { error } = await supabase.from('products').delete().eq('id', editingProduct.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      Alert.alert('Deleted', 'Product removed.');
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert('Delete Failed', err?.message ?? 'Failed'),
  });

  if (userLoading || !user || !role) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!canEditThis) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, padding: 20, paddingTop: 20 + insets.top }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>Not allowed</Text>
          <Text style={{ marginTop: 8, color: colors.text }}>
            {isEdit ? 'You cannot edit this product.' : 'Only companies can add products.'}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              marginTop: 16,
              backgroundColor: colors.primary,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const allImagesPreview = [...existingImages, ...newImageUris];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: 20, paddingBottom: 20 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary, marginTop: Math.max(6, insets.top) }}>
          {isEdit ? 'Edit Product' : 'Add Product'}
        </Text>

        {/* Images */}
        <View style={{ marginTop: 16 }}>
          <Text style={{ color: colors.text, marginBottom: 8 }}>Images (max 3)</Text>

          <TouchableOpacity
            onPress={pickImages}
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 10,
              padding: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: '700' }}>+ Add Photos</Text>
          </TouchableOpacity>

          {allImagesPreview.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              {allImagesPreview.map((img, idx) => (
                <TouchableOpacity key={String(idx)} onPress={() => removeImage(img)} activeOpacity={0.8}>
                  <Image
                    source={{ uri: img }}
                    style={{ width: 90, height: 90, borderRadius: 12, marginRight: 10 }}
                  />
                  <Text style={{ position: 'absolute', right: 16, top: 6, color: '#fff', fontWeight: '900' }}>
                    ✕
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Inputs */}
        {([
          ['Name', name, setName, 'default'],
          ['Price (SOS)', price, setPrice, 'decimal-pad'],
          ['Unit (e.g. kg)', unit, setUnit, 'default'],
          ['Stock Quantity', stock, setStock, 'numeric'],
        ] as const).map(([label, value, setter, keyboard]) => (
          <View key={label} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.text, marginBottom: 6 }}>{label}</Text>
            <TextInput
              value={value}
              onChangeText={setter}
              keyboardType={keyboard}
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 10,
                padding: 12,
                color: colors.text,
              }}
            />
          </View>
        ))}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
          <Text style={{ color: colors.text, marginRight: 10 }}>Active</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            thumbColor={isActive ? colors.primary : '#ccc'}
            trackColor={{ true: colors.accent, false: '#e5e7eb' }}
          />
        </View>

        <TouchableOpacity
          style={{
            marginTop: 24,
            backgroundColor: colors.primary,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
            opacity: mutation.isPending ? 0.7 : 1,
          }}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700' }}>{isEdit ? 'Update Product' : 'Save Product'}</Text>
          )}
        </TouchableOpacity>

        {isEdit && (
          <TouchableOpacity
            style={{
              marginTop: 14,
              backgroundColor: '#dc2626',
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
              opacity: deleteMutation.isPending ? 0.7 : 1,
            }}
            disabled={deleteMutation.isPending}
            onPress={() =>
              Alert.alert('Delete Product', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
              ])
            }
          >
            {deleteMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700' }}>Delete Product</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
