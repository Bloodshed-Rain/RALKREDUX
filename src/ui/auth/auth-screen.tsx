import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { Button, Field } from '@/src/ui/primitives/v2';
import { IconBrand } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';
import {
  isAppleSignInSupported,
  sendEmailOtp,
  signInWithApple,
  signInWithGoogle,
  verifyEmailOtp,
} from '@/src/cloud/supabase/auth';
import { PrefKeys, readPref, writePref } from '@/src/storage/local-prefs';

type Busy = null | 'apple' | 'google' | 'email';
type EmailStep = 'enter_email' | 'enter_code';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Surface a friendly message; swallow user-cancelled flows silently.
function messageFor(error: unknown): string | null {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw === 'auth_cancelled') return null;
  if (raw === 'supabase_not_configured') {
    return 'Sign-in is not configured for this build.';
  }
  if (/expired|invalid/i.test(raw)) return 'That code is invalid or has expired. Try again.';
  if (/rate|limit|too many/i.test(raw)) return 'Too many attempts. Wait a minute and try again.';
  if (/network|fetch/i.test(raw)) return 'Network error. Check your connection and retry.';
  return raw || 'Something went wrong. Please try again.';
}

export function AuthScreen() {
  const { theme, tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [busy, setBusy] = React.useState<Busy>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<EmailStep>('enter_email');
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');

  // Prefill the last email used for OTP so returning users don't retype it.
  React.useEffect(() => {
    void readPref<string>(PrefKeys.lastAuthEmail, '').then((saved) => {
      if (saved) setEmail(saved);
    });
  }, []);

  const disabled = busy !== null;

  // A successful sign-in flips the Supabase auth state; AuthProvider/AuthGate
  // re-render and unmount this screen, so there's no manual navigation here.
  async function run(kind: Exclude<Busy, null>, fn: () => Promise<unknown>) {
    setError(null);
    setBusy(kind);
    try {
      await fn();
      haptics.success();
    } catch (e) {
      const msg = messageFor(e);
      if (msg) {
        setError(msg);
        haptics.error();
      }
    } finally {
      setBusy(null);
    }
  }

  function onSendCode() {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    void run('email', async () => {
      await sendEmailOtp(trimmed);
      void writePref(PrefKeys.lastAuthEmail, trimmed);
      setStep('enter_code');
    });
  }

  function onVerifyCode() {
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    void run('email', () => verifyEmailOtp(email.trim(), code.trim()));
  }

  const titleStyle: TextStyle = {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 26,
    letterSpacing: -0.5,
    color: tokens.text,
    textAlign: 'center',
  };
  const subStyle: TextStyle = {
    ...type.cardSub,
    color: tokens.textDim,
    textAlign: 'center',
    lineHeight: 20,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: tokens.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 28,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          gap: 22,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', gap: 12 }}>
          <IconBrand size={68} color={tokens.text} fill={tokens.accent} />
          <Text style={titleStyle}>RALB</Text>
          <Text style={subStyle}>
            Sign in to your rope-access logbook. Your records stay on this device; an account
            secures remote signing. First sign-in needs internet — after that the app works
            offline.
          </Text>
        </View>

        {error ? (
          <View
            style={{
              backgroundColor: tokens.dangerSoft,
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: tokens.danger,
            }}
          >
            <Text style={{ ...type.cardSub, color: tokens.text }}>{error}</Text>
          </View>
        ) : null}

        {step === 'enter_email' ? (
          <View style={{ gap: 12 }}>
            {isAppleSignInSupported() ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={
                  theme.mode === 'dark'
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={12}
                style={{ height: 48, width: '100%' }}
                onPress={() => {
                  if (!disabled) void run('apple', signInWithApple);
                }}
              />
            ) : null}

            <Button
              variant="outline"
              size="lg"
              full
              disabled={disabled}
              onPress={() => void run('google', signInWithGoogle)}
            >
              {busy === 'google' ? 'Connecting…' : 'Continue with Google'}
            </Button>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: tokens.line }} />
              <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>OR EMAIL</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: tokens.line }} />
            </View>

            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Button
              variant="primary"
              size="lg"
              full
              disabled={disabled}
              onPress={onSendCode}
            >
              {busy === 'email' ? 'Sending…' : 'Email me a code'}
            </Button>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={subStyle}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={{ color: tokens.text, fontFamily: 'Manrope_700Bold' }}>{email.trim()}</Text>
            </Text>
            <Field
              label="6-digit code"
              value={code}
              onChangeText={(v) => setCode(v.replace(/[^0-9]/g, ''))}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
            />
            <Button
              variant="primary"
              size="lg"
              full
              disabled={disabled}
              onPress={onVerifyCode}
            >
              {busy === 'email' ? 'Verifying…' : 'Verify & sign in'}
            </Button>
            <Button
              variant="ghost"
              size="md"
              full
              disabled={disabled}
              onPress={() => {
                setStep('enter_email');
                setCode('');
                setError(null);
              }}
            >
              Use a different email
            </Button>
          </View>
        )}

        {busy ? (
          <View style={{ alignItems: 'center' }}>
            <ActivityIndicator color={tokens.accent} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
