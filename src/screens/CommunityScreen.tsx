import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/session';

type PostRow = { id: number; text: string; created_at: string; author?: string };

async function fetchPosts(): Promise<PostRow[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(`id, text, created_at, user_id, profiles:profiles(full_name)`)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const prof = row.profiles;
    const author = Array.isArray(prof) ? prof[0]?.full_name : prof?.full_name;
    return { id: row.id, text: row.text, created_at: row.created_at, author };
  });
}

export default function CommunityScreen() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data = [] } = useQuery({ queryKey: ['posts'], queryFn: fetchPosts });
  const [text, setText] = useState('');

  const createPost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('posts').insert({ user_id: user!.id, text });
      if (error) throw error;
    },
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['posts'] }); }
  });

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {user && (
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontWeight: '700' }}>Create Post</Text>
          <TextInput
            placeholder="Share a problem or tip…"
            value={text}
            onChangeText={setText}
            style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, marginTop: 8 }}
          />
          <Button title="Post" onPress={() => createPost.mutate()} />
        </View>
      )}

      <FlatList
        style={{ marginTop: 12 }}
        data={data}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <View style={{ padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 }}>
            <Text style={{ fontWeight: '700' }}>{item.author ?? 'Farmer'}</Text>
            <Text style={{ marginTop: 4 }}>{item.text}</Text>
            <Text style={{ color: '#6b7280', marginTop: 6 }}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );
}
