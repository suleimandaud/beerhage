// src/screens/CommunityScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as atob } from 'base-64';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/session';
import { colors } from '../theme/colors';

type PostRow = {
  id: number;
  text: string;
  created_at: string;
  author?: string | null;
  images?: string[];
  ai_reply?: string | null;
};

async function fetchPosts(): Promise<PostRow[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, text, created_at, media_urls, ai_answer')
    .order('created_at', { ascending: false });

  if (error) {
    console.log('fetchPosts error:', error);
    throw error;
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    text: row.text,
    created_at: row.created_at,
    author: null,
    images: Array.isArray(row.media_urls)
      ? row.media_urls
      : typeof row.media_urls === 'string'
        ? (() => {
            try {
              return JSON.parse(row.media_urls);
            } catch {
              return [];
            }
          })()
        : [],
    ai_reply: typeof row.ai_answer === 'string' ? row.ai_answer : null,
  }));
}

// helpers
function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function uploadToStorage(uri: string, userId: string) {
  const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
  const arrayBuffer = base64ToArrayBuffer(base64);

  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from('post-media').upload(path, arrayBuffer, {
    contentType,
    upsert: false,
  });

  if (error) {
    console.log('STORAGE UPLOAD ERROR:', error);
    throw error;
  }

  const { data } = supabase.storage.from('post-media').getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

async function createSignedUrls(paths: string[]) {
  const results = await Promise.all(
    paths.map(async (p) => {
      const { data, error } = await supabase.storage.from('post-media').createSignedUrl(p, 60 * 10); // 10 min
      if (error) {
        console.log('SIGNED URL ERROR:', { path: p, error });
        return null;
      }
      return data?.signedUrl ?? null;
    })
  );

  return results.filter(Boolean) as string[];
}

export default function CommunityScreen() {
  const qc = useQueryClient();
  const { user } = useSession();

  const { data = [], isFetching } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });

  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: 3,
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // ✅ new
      quality: 0.8,
    });

    if (!res.canceled) {
      const uris = res.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 3));
    }
  };

  const createPost = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      if (!text.trim() && images.length === 0) throw new Error('Write something or add a photo');

      setUploading(true);

      // 1) Insert post
      const { data: inserted, error: insertErr } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          text: text.trim(),
        })
        .select('id')
        .single();

      if (insertErr) {
        console.log('POST INSERT ERROR:', insertErr);
        throw insertErr;
      }

      const postId = inserted.id as number;

      // 2) Upload images
      let publicUrls: string[] = [];
      let paths: string[] = [];

      if (images.length) {
        for (const uri of images) {
          // eslint-disable-next-line no-await-in-loop
          const up = await uploadToStorage(uri, user.id);
          publicUrls.push(up.publicUrl);
          paths.push(up.path);
        }

        // Save PUBLIC urls in DB for app display
        const { error: updErr } = await supabase
          .from('posts')
          .update({ media_urls: publicUrls })
          .eq('id', postId)
          .eq('user_id', user.id);

        if (updErr) {
          console.log('POST UPDATE media_urls ERROR:', updErr);
          throw updErr;
        }
      }

      // 3) AI reply (use SIGNED urls for OpenRouter)
      try {
        const signedUrls = paths.length ? await createSignedUrls(paths) : [];

        const prompt =
          `A farmer posted this problem or tip:\n\n"${text.trim() || '(no text)'}"\n\n` +
          (signedUrls.length ? `Attached image URLs: ${signedUrls.join(', ')}\n` : '') +
          `Reply as a helpful agronomist. Be concise and practical with steps if needed.`;

        const { data: s } = await supabase.auth.getSession();
        const token = s.session?.access_token;

        const res = await fetch('https://ovxqseavtfhtabmrafgn.functions.supabase.co/advice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ prompt, imageUrls: signedUrls }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok || json?.error) {
          console.log('AI FUNCTION ERROR:', { status: res.status, json: JSON.stringify(json) });
          return;
        }

        const ai = json?.choices?.[0]?.message?.content;

        if (typeof ai === 'string' && ai.trim().length > 0) {
          const { error: aiUpdErr } = await supabase
            .from('posts')
            .update({ ai_answer: ai.trim() })
            .eq('id', postId);

          if (aiUpdErr) console.log('POST UPDATE ai_answer ERROR:', aiUpdErr);
        } else {
          console.log('AI EMPTY RESPONSE:', json);
        }
      } finally {
        setUploading(false);
      }
    },

    onSuccess: () => {
      setText('');
      setImages([]);
      qc.invalidateQueries({ queryKey: ['posts'] });
    },

    onError: (err: any) => {
      setUploading(false);
      Alert.alert('Post Failed', err?.message ?? 'Unknown error');
    },
  });

  const canPost = !uploading && (text.trim().length > 0 || images.length > 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, padding: 16 }}>
        {user && (
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>Create Post</Text>

            <TextInput
              placeholder="Share a problem or tip…"
              value={text}
              onChangeText={setText}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 10,
                backgroundColor: '#fff',
              }}
              multiline
            />

            {!!images.length && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                {images.map((uri) => (
                  <Image key={uri} source={{ uri }} style={{ width: 70, height: 70, borderRadius: 8 }} />
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                onPress={pickImages}
                style={{
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text>Add Photos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => createPost.mutate()}
                disabled={!canPost}
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  opacity: canPost ? 1 : 0.7,
                }}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <FlatList
          style={{ marginTop: 12 }}
          data={data}
          refreshing={isFetching}
          onRefresh={() => qc.invalidateQueries({ queryKey: ['posts'] })}
          keyExtractor={(i) => String(i.id)}
          ListEmptyComponent={
            !isFetching ? (
              <Text style={{ textAlign: 'center', marginTop: 32, color: colors.muted }}>
                No posts yet. Be the first to share!
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <View
              style={{
                padding: 12,
                backgroundColor: '#fff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontWeight: '700' }}>{item.author ?? 'Farmer'}</Text>
              <Text style={{ marginTop: 4 }}>{item.text}</Text>

              {!!item.images?.length && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {item.images.map((url) => (
                    <Image key={url} source={{ uri: url }} style={{ width: 110, height: 110, borderRadius: 10 }} />
                  ))}
                </View>
              )}

              {item.ai_reply ? (
                <View
                  style={{
                    marginTop: 10,
                    backgroundColor: '#F4FAF5',
                    borderRadius: 10,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#E0F0E4',
                  }}
                >
                  <Text style={{ fontWeight: '700', color: colors.primary }}>AI Advisor</Text>
                  <Text style={{ marginTop: 4 }}>{item.ai_reply}</Text>
                </View>
              ) : null}

              <Text style={{ color: colors.muted, marginTop: 6 }}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
