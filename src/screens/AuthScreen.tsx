import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

type Mode = 'signIn' | 'signUp' | 'reset';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const nav = useNavigation<any>();

  const switchMode = (m: Mode) => {
    setMode(m);
    if (m === 'reset') setPassword('');
  };

  const onSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter your email.');
      return;
    }
    try {
      setBusy(true);
      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        Alert.alert('Welcome back', 'Signed in successfully.');
        nav.goBack();
      } else if (mode === 'signUp') {
        if (password.length < 6) {
          Alert.alert('Weak password', 'Use at least 6 characters.');
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: email.split('@')[0] },
            emailRedirectTo: undefined, // add a deep link if you enable email confirmation
          },
        });
        if (error) throw error;
        Alert.alert('Account created', 'Check your inbox if email confirmation is required.');
        nav.goBack();
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: undefined, // optional deep link for in-app reset
        });
        if (error) throw error;
        Alert.alert('Email sent', 'Check your inbox for a password reset link.');
        nav.goBack();
      }
    } catch (e: any) {
      Alert.alert('Auth error', e.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', marginBottom: 12 }}>
          {mode === 'signIn' ? 'Sign in' : mode === 'signUp' ? 'Create account' : 'Reset password'}
        </Text>

        {/* Email */}
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="you@example.com"
          style={input}
        />

        {/* Password (hide on reset) */}
        {mode !== 'reset' && (
          <>
            <Text style={{ fontWeight: '700', marginBottom: 6, marginTop: 12 }}>Password</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPwd}
                placeholder="••••••••"
                style={input}
              />
              <TouchableOpacity
                onPress={() => setShowPwd((s) => !s)}
                style={{ position: 'absolute', right: 12, top: 12 }}
              >
                <MaterialCommunityIcons
                  name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Submit */}
        <TouchableOpacity
          onPress={onSubmit}
          disabled={busy}
          style={{
            marginTop: 18,
            backgroundColor: colors.primary,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '800' }}>
              {mode === 'signIn' ? 'Sign in' : mode === 'signUp' ? 'Create account' : 'Send reset link'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Switch links */}
        {mode !== 'signIn' && (
          <TouchableOpacity onPress={() => switchMode('signIn')} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Have an account? Sign in</Text>
          </TouchableOpacity>
        )}
        {mode !== 'signUp' && (
          <TouchableOpacity onPress={() => switchMode('signUp')} style={{ marginTop: 8, alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>New here? Create account</Text>
          </TouchableOpacity>
        )}
        {mode !== 'reset' && (
          <TouchableOpacity onPress={() => switchMode('reset')} style={{ marginTop: 8, alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Forgot password?</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const input = {
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 10,
  padding: 12,
  backgroundColor: '#fff',
} as const;
