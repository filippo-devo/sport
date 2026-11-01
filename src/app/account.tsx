import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { fetchProfile, signIn, signOut, signUp, useSession, type Profile } from '../backend/auth';
import { disconnect, joinCoach, myCoaches, setCoachMode, type Person } from '../backend/coach';
import { syncCoachPlans, syncWorkouts } from '../backend/sync';
import { backendConfigured } from '../backend/supabase';
import { CaretRightIcon, CopyIcon, ShareIcon, UsersIcon, XIcon } from '../components/icons';
import { Button, Card, Divider, Notice, SectionTitle, Segmented } from '../components/ui/controls';
import { NavBar } from '../components/ui/headers';
import { Screen } from '../components/ui/layout';
import { useT } from '../i18n';
import { colors, fonts, radius, space, type } from '../theme/tokens';

/** Account: sign in / sign up, coach mode with invite code, and the client's coaches. */
export default function AccountScreen() {
  const { t } = useT();
  const { session, ready } = useSession();

  return (
    <Screen top={<NavBar title={t('account.title')} />}>
      {!backendConfigured ? (
        <Notice icon={UsersIcon} text={t('account.notConfigured')} />
      ) : !ready ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
      ) : session ? (
        <SignedIn email={session.user.email ?? ''} userId={session.user.id} />
      ) : (
        <AuthForm />
      )}
    </Screen>
  );
}

function AuthForm() {
  const { t } = useT();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 8 && (mode === 'in' || name.trim().length > 0);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'in') await signIn(email, password);
      else {
        const r = await signUp(email, password, name);
        if (!r.signedIn) setMsg({ text: t('account.confirmEmail'), error: false });
      }
    } catch (e) {
      const m = (e as Error).message ?? '';
      setMsg({ text: /invalid login/i.test(m) ? t('account.errCredentials') : /already registered/i.test(m) ? t('account.errExists') : t('account.errGeneric'), error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: space.md }}>
      <Text style={styles.intro}>{t('account.intro')}</Text>
      <Segmented
        value={mode}
        onChange={(m) => {
          setMode(m);
          setMsg(null);
        }}
        options={[
          { value: 'in', label: t('account.signIn') },
          { value: 'up', label: t('account.signUp') },
        ]}
      />
      {mode === 'up' && (
        <TextInput value={name} onChangeText={setName} placeholder={t('account.name')} placeholderTextColor={colors.textSecondary} style={styles.input} maxLength={40} accessibilityLabel={t('account.name')} />
      )}
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder={t('account.email')}
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        accessibilityLabel={t('account.email')}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder={t('account.password')}
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        secureTextEntry
        autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
        accessibilityLabel={t('account.password')}
      />
      {msg && <Text style={[styles.meta, { color: msg.error ? colors.danger : colors.success }]}>{msg.text}</Text>}
      <Button label={mode === 'in' ? t('account.signIn') : t('account.signUp')} onPress={submit} disabled={!valid} loading={busy} />
      <Text style={styles.meta}>{t('account.privacy')}</Text>
    </View>
  );
}

function SignedIn({ email, userId }: { email: string; userId: string }) {
  const { t } = useT();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [coaches, setCoaches] = useState<Person[]>([]);
  const [code, setCode] = useState('');
  const [joinMsg, setJoinMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([fetchProfile(), myCoaches().catch(() => [])]);
    setProfile(p);
    setCoaches(c);
  }, []);
  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const toggleCoach = async (on: boolean) => {
    setBusy(true);
    try {
      const invite = await setCoachMode(on);
      setProfile((p) => (p ? { ...p, is_coach: on, invite_code: invite ?? p.invite_code } : p));
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setJoinMsg(null);
    try {
      await joinCoach(code);
      setCode('');
      setJoinMsg({ text: t('account.joined'), error: false });
      await load();
      // Share existing workouts and pull any plans right away.
      syncWorkouts(userId).catch(() => {});
      syncCoachPlans(userId).catch(() => {});
    } catch (e) {
      setJoinMsg({ text: (e as Error).message === 'own_code' ? t('account.errOwnCode') : t('account.errCode'), error: true });
    }
  };

  return (
    <View>
      <Card style={styles.card}>
        <Text style={styles.name}>{profile?.display_name || '—'}</Text>
        <Text style={styles.meta}>{email}</Text>
      </Card>

      {/* Client side */}
      <SectionTitle style={styles.section} title={t('account.myCoaches')} />
      <Card style={styles.list}>
        {coaches.length === 0 && <Text style={[styles.meta, { paddingVertical: space.md }]}>{t('account.noCoaches')}</Text>}
        {coaches.map((c, i) => (
          <View key={c.id}>
            {i > 0 && <Divider />}
            <View style={styles.row}>
              <UsersIcon size={20} color={colors.accent} weight="fill" />
              <Text style={[styles.rowLabel, { flex: 1 }]}>{c.name}</Text>
              <Pressable
                onPress={async () => {
                  await disconnect(c.id, userId).catch(() => {});
                  load();
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('account.disconnect')}
              >
                <XIcon size={16} color={colors.textSecondary} weight="bold" />
              </Pressable>
            </View>
          </View>
        ))}
      </Card>
      {coaches.length > 0 && <Text style={[styles.meta, { marginTop: space.sm }]}>{t('account.sharingNote')}</Text>}
      <View style={styles.joinRow}>
        <TextInput
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          placeholder={t('account.coachCode')}
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { flex: 1 }]}
          autoCapitalize="characters"
          maxLength={8}
          accessibilityLabel={t('account.coachCode')}
        />
        <Button label={t('account.join')} onPress={join} disabled={code.trim().length < 6} />
      </View>
      {joinMsg && <Text style={[styles.meta, { marginTop: space.sm, color: joinMsg.error ? colors.danger : colors.success }]}>{joinMsg.text}</Text>}

      {/* Coach side */}
      <SectionTitle style={styles.section} title={t('account.coachMode')} />
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>{t('account.iAmCoach')}</Text>
            <Text style={styles.meta}>{t('account.iAmCoachBody')}</Text>
          </View>
          <Switch
            value={!!profile?.is_coach}
            disabled={!profile || busy}
            onValueChange={toggleCoach}
            trackColor={{ true: colors.accent, false: colors.track }}
            thumbColor={profile?.is_coach ? colors.textOnAccent : colors.textPrimary}
            accessibilityLabel={t('account.iAmCoach')}
          />
        </View>
        {profile?.is_coach && profile.invite_code && (
          <>
            <Divider />
            <Text style={styles.meta}>{t('account.inviteCode')}</Text>
            <View style={styles.codeRow}>
              <Text style={styles.code} selectable>
                {profile.invite_code}
              </Text>
              <Button
                label={copied ? t('account.copied') : t('account.copy')}
                icon={CopyIcon}
                size="sm"
                variant="secondary"
                onPress={async () => {
                  await Clipboard.setStringAsync(profile.invite_code!);
                  setCopied(true);
                }}
              />
              <Button
                label={t('account.share')}
                icon={ShareIcon}
                size="sm"
                variant="secondary"
                onPress={() => Share.share({ message: t('account.shareMessage', { code: profile.invite_code! }) }).catch(() => {})}
              />
            </View>
            <Divider />
            <Pressable style={styles.row} onPress={() => router.push('/trainer')} accessibilityRole="button">
              <Text style={[styles.rowLabel, { flex: 1, color: colors.accent }]}>{t('trainer.title')}</Text>
              <CaretRightIcon size={14} color={colors.textSecondary} weight="bold" />
            </Pressable>
          </>
        )}
      </Card>

      <Button label={t('account.signOut')} variant="secondary" onPress={() => signOut()} style={{ marginTop: space.xxl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { ...type.body, color: colors.textSecondary },
  meta: { ...type.caption, color: colors.textSecondary },
  card: { gap: space.sm },
  name: { fontFamily: fonts.bold, fontSize: 20, color: colors.textPrimary },
  section: { marginTop: space.xxl },
  list: { marginTop: space.md, paddingVertical: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  rowLabel: { ...type.itemTitle, color: colors.textPrimary },
  joinRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md, alignItems: 'center' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  code: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: 2, color: colors.accent, flex: 1, minWidth: 120 },
  input: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardStroke,
    paddingHorizontal: space.md,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 16,
  },
});
