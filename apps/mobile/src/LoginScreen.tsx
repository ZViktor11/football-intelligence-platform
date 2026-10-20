import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { login, type LoginResponse } from './auth';

type LoginScreenProps = {
  onLogin: (session: LoginResponse) => void;
  onCancel: () => void;
};

export function LoginScreen({
  onLogin,
  onCancel,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (loading) return;

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const session = await login(email, password);
      onLogin(session);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not sign in.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.form}>
          <Text style={styles.eyebrow}>
            FOOTBALL INTELLIGENCE
          </Text>

          <Text style={styles.title}>Admin login</Text>

          <Text style={styles.subtitle}>
            Sign in to manage match events.
          </Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="admin@example.com"
            placeholderTextColor="#64748b"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#64748b"
            secureTextEntry
            editable={!loading}
          />

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          <Pressable
            style={[
              styles.loginButton,
              loading && styles.disabledButton,
            ]}
            onPress={() => void handleLogin()}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#0b1220" />
            ) : (
              <Text style={styles.loginButtonText}>
                Sign in
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={onCancel}
            disabled={loading}
            accessibilityRole="button"
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>
              Back to matches
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  form: {
    gap: 12,
  },
  eyebrow: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    color: '#94a3b8',
    marginBottom: 18,
  },
  label: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
  },
  error: {
    color: '#fca5a5',
    marginTop: 6,
  },
  loginButton: {
    backgroundColor: '#38bdf8',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#0b1220',
    fontWeight: '800',
    fontSize: 16,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 14,
  },
  cancelText: {
    color: '#94a3b8',
  },
});