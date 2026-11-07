import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  BarbellIcon,
  BellIcon,
  CameraIcon,
  CaretRightIcon,
  FireIcon,
  ForkKnifeIcon,
  DropIcon,
  GearSixIcon,
  PencilSimpleIcon,
  FootprintsIcon,
  QrCodeIcon,
  ScalesIcon,
  StackIcon,
  UserIcon,
  UsersIcon,
  type Icon,
} from '../../components/icons';
import { Button, Card, Divider, IconButton, SectionTitle, pressedStyle } from '../../components/ui/controls';
import { TabHeader } from '../../components/ui/headers';
import { Screen } from '../../components/ui/layout';
import { NumberSheet, Sheet } from '../../components/ui/sheets';
import type { Goals } from '../../data/types';
import { useT, type TKey } from '../../i18n';
import { deletePhotoFile, pickPhoto } from '../../lib/photos';
import { formatVolume, formatWeight, fromDisplayWeight, toDisplayWeight } from '../../lib/units';
import { useStore } from '../../store';
import { sessionVolume } from '../../store/derived';
import { activeDays, dayStreak } from '../../store/stats';
import { colors, fonts, radius, space, type } from '../../theme/tokens';

type GoalKey = keyof Goals;
type GoalRow = { key: GoalKey; label: TKey; unit: string; step: number; min: number; max: number };

const GOAL_ROWS: Record<GoalKey, GoalRow> = {
  kcal: { key: 'kcal', label: 'profile.kcal', unit: 'kcal', step: 50, min: 1000, max: 6000 },
  protein: { key: 'protein', label: 'macro.protein', unit: 'g', step: 5, min: 20, max: 400 },
  carbs: { key: 'carbs', label: 'macro.carbs', unit: 'g', step: 5, min: 20, max: 800 },
  fat: { key: 'fat', label: 'macro.fat', unit: 'g', step: 5, min: 20, max: 300 },
  targetWeight: { key: 'targetWeight', label: 'profile.targetWeight', unit: '', step: 0.5, min: 30, max: 300 },
  workoutsPerWeek: { key: 'workoutsPerWeek', label: 'profile.workoutsPerWeek', unit: '', step: 1, min: 1, max: 7 },
  workoutsPerMonth: { key: 'workoutsPerMonth', label: 'profile.workoutsPerMonth', unit: '', step: 1, min: 1, max: 31 },
  steps: { key: 'steps', label: 'profile.steps', unit: '', step: 500, min: 1000, max: 40000 },
  waterMl: { key: 'waterMl', label: 'profile.waterGoal', unit: 'ml', step: 250, min: 500, max: 6000 },
};

export default function ProfileScreen() {
  const { t, tn } = useT();
  const s = useStore();
  const [editing, setEditing] = useState<GoalKey | null>(null);
  const [editProfile, setEditProfile] = useState(false);
  const units = s.settings.units;
  const g = s.goals;

  const initials = s.settings.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const totalVolume = s.sessions.reduce((n, x) => n + sessionVolume(x), 0);
  const streak = dayStreak(activeDays({ sessions: s.sessions, meals: s.meals, water: s.water, supplementLogs: s.supplementLogs }));
  const macroKcal = g.protein * 4 + g.carbs * 4 + g.fat * 9;
  const macroOff = Math.abs(macroKcal - g.kcal) > 100;
  const monthKey = new Date().toISOString().slice(0, 7);
  const gymThisMonth = s.gymVisits.filter((v) => v.date.startsWith(monthKey)).length;
  const row = editing ? GOAL_ROWS[editing] : null;

  return (
    <Screen tabBar>
      <TabHeader
        title={t('profile.title')}
        right={<IconButton icon={GearSixIcon} label={t('profile.settings')} onPress={() => router.push('/settings')} />}
      />

      <Card style={styles.hero} onPress={() => setEditProfile(true)} accessibilityLabel={t('profile.editProfile')}>
        <Avatar uri={s.settings.avatarUri} initials={initials} size={64} />
        <Text style={[styles.name, !s.settings.name && { color: colors.textSecondary }]} numberOfLines={1}>
          {s.settings.name || t('profile.namePlaceholder')}
        </Text>
        <View style={styles.editDot}>
          <PencilSimpleIcon size={16} color={colors.textPrimary} weight="bold" />
        </View>
      </Card>

      <Card style={styles.stats}>
        <Stat icon={BarbellIcon} label={t('profile.workouts')} value={String(s.sessions.length)} />
        <Stat icon={StackIcon} label={t('profile.weightLifted')} value={formatVolume(totalVolume, units)} border />
        <Stat icon={FireIcon} iconColor={colors.warning} label={t('today.streak')} value={tn('unit.days', streak)} border />
      </Card>

      <SectionTitle style={styles.section} title={t('profile.accountSection')} />
      <Card style={styles.list}>
        <ListRow icon={UsersIcon} tint={colors.accent} label={t('profile.account')} onPress={() => router.push('/account')} />
        <Divider />
        <ListRow
          icon={BarbellIcon}
          tint={colors.accent}
          label={t('profile.myGyms')}
          sub={s.settings.myGyms?.[0]?.name ?? t('profile.myGymsEmpty')}
          onPress={() => router.push('/gym/mine')}
        />
        <Divider />
        <ListRow
          icon={QrCodeIcon}
          tint={colors.success}
          label={t('profile.gymVisits')}
          sub={t('profile.gymThisMonth', { n: gymThisMonth })}
          onPress={() => router.push('/gym')}
        />
        <Divider />
        <ListRow icon={BellIcon} tint={colors.warning} label={t('profile.notifications')} onPress={() => router.push('/notifications')} />
      </Card>

      <SectionTitle style={styles.section} title={t('profile.goals')} />
      <Card style={styles.macroCard}>
        <Pressable
          style={({ pressed }) => [styles.macroHead, pressed && pressedStyle]}
          onPress={() => setEditing('kcal')}
          accessibilityRole="button"
          accessibilityLabel={t('profile.edit', { label: t('profile.kcal') })}
        >
          <IconTile icon={ForkKnifeIcon} tint={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tileLabel}>{t('profile.kcal')}</Text>
            <Text style={styles.tileValue}>
              {g.kcal} <Text style={styles.tileUnit}>kcal</Text>
            </Text>
          </View>
          <CaretRightIcon size={14} color={colors.textSecondary} weight="bold" />
        </Pressable>
        <View style={styles.macros}>
          {(['protein', 'carbs', 'fat'] as const).map((k) => (
            <Pressable
              key={k}
              style={({ pressed }) => [styles.macro, pressed && pressedStyle]}
              onPress={() => setEditing(k)}
              accessibilityRole="button"
              accessibilityLabel={t('profile.edit', { label: t(GOAL_ROWS[k].label) })}
            >
              <Text style={styles.tileLabel}>{t(GOAL_ROWS[k].label)}</Text>
              <Text style={styles.macroValue}>{g[k]} g</Text>
              <View style={[styles.macroBar, { backgroundColor: colors[k] }]} />
            </Pressable>
          ))}
        </View>
        <Text style={[styles.hint, macroOff && { color: colors.warning }]}>{t('profile.macroCheck', { n: macroKcal })}</Text>
      </Card>

      <View style={styles.grid}>
        <GoalTile
          icon={BarbellIcon}
          tint={colors.success}
          label={t('profile.workoutsPerWeek')}
          value={String(g.workoutsPerWeek)}
          onPress={() => setEditing('workoutsPerWeek')}
          a11y={t('profile.edit', { label: t('profile.workoutsPerWeek') })}
        />
        <GoalTile
          icon={ScalesIcon}
          tint={colors.textPrimary}
          label={t('profile.targetWeight')}
          value={formatWeight(g.targetWeight, units)}
          onPress={() => setEditing('targetWeight')}
          a11y={t('profile.edit', { label: t('profile.targetWeight') })}
        />
        <GoalTile
          icon={FootprintsIcon}
          tint={colors.warning}
          label={t('profile.steps')}
          value={g.steps.toLocaleString()}
          onPress={() => setEditing('steps')}
          a11y={t('profile.edit', { label: t('profile.steps') })}
        />
        <GoalTile
          icon={DropIcon}
          tint={colors.fat}
          label={t('profile.waterGoal')}
          value={String(g.waterMl)}
          unit="ml"
          onPress={() => setEditing('waterMl')}
          a11y={t('profile.edit', { label: t('profile.waterGoal') })}
        />
      </View>

      {row && (
        <NumberSheet
          visible={!!editing}
          onClose={() => setEditing(null)}
          title={t(row.label)}
          value={row.key === 'targetWeight' ? toDisplayWeight(g.targetWeight, units) : g[row.key]}
          unit={row.key === 'targetWeight' ? units : row.unit}
          step={row.step}
          decimals={row.key === 'targetWeight' ? 1 : 0}
          min={row.key === 'targetWeight' ? toDisplayWeight(row.min, units) : row.min}
          max={row.key === 'targetWeight' ? toDisplayWeight(row.max, units) : row.max}
          onSave={(v) => s.setGoals({ [row.key]: row.key === 'targetWeight' ? Math.round(fromDisplayWeight(v, units) * 10) / 10 : v })}
        />
      )}
      <ProfileSheet visible={editProfile} onClose={() => setEditProfile(false)} />
    </Screen>
  );
}

function Avatar({ uri, initials, size }: { uri?: string; initials: string; size: number }) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[box, { backgroundColor: colors.surfaceRaised }]} />;
  return (
    <View style={[styles.avatar, box]}>
      {initials ? (
        <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
      ) : (
        <UserIcon size={size * 0.47} color={colors.textOnAccent} weight="fill" />
      )}
    </View>
  );
}

/** Edit name and profile picture. */
function ProfileSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useT();
  const settings = useStore((x) => x.settings);
  const setSettings = useStore((x) => x.setSettings);
  const [name, setName] = useState(settings.name);
  const [uri, setUri] = useState(settings.avatarUri);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    // Reset the draft each time the sheet opens.
    setWasVisible(visible);
    if (visible) {
      setName(settings.name);
      setUri(settings.avatarUri);
    }
  }
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const choose = async () => {
    const photo = await pickPhoto();
    if (photo) setUri(photo.uri);
  };
  const save = () => {
    if (settings.avatarUri && settings.avatarUri !== uri) deletePhotoFile(settings.avatarUri);
    setSettings({ name: name.trim(), avatarUri: uri });
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('profile.editProfile')}>
      <View style={styles.sheetBody}>
        <Pressable onPress={choose} accessibilityRole="button" accessibilityLabel={t('profile.changePhoto')} style={styles.sheetAvatar}>
          <Avatar uri={uri} initials={initials} size={96} />
          <View style={styles.camBadge}>
            <CameraIcon size={16} color={colors.textPrimary} weight="bold" />
          </View>
        </Pressable>
        <View style={styles.photoActions}>
          <Pressable onPress={choose} accessibilityRole="button" hitSlop={6}>
            <Text style={styles.link}>{uri ? t('profile.changePhoto') : t('profile.addPhoto')}</Text>
          </Pressable>
          {uri ? (
            <Pressable onPress={() => setUri(undefined)} accessibilityRole="button" hitSlop={6}>
              <Text style={[styles.link, { color: colors.danger }]}>{t('profile.removePhoto')}</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.fieldLabel}>{t('profile.name')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('profile.namePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          accessibilityLabel={t('profile.name')}
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={save}
        />
        <Button label={t('common.save')} onPress={save} />
      </View>
    </Sheet>
  );
}

function IconTile({ icon: Glyph, tint }: { icon: Icon; tint: string }) {
  return (
    <View style={[styles.iconTile, { backgroundColor: tint + '22' }]}>
      <Glyph size={18} color={tint} weight="bold" />
    </View>
  );
}

function Stat({ icon: Glyph, iconColor, label, value, border }: { icon: Icon; iconColor?: string; label: string; value: string; border?: boolean }) {
  return (
    <View style={[styles.stat, border && styles.statBorder]}>
      <View style={styles.statHead}>
        <Glyph size={14} color={iconColor ?? colors.textSecondary} weight={iconColor ? 'fill' : 'bold'} />
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function ListRow({ icon, tint, label, sub, onPress }: { icon: Icon; tint: string; label: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <IconTile icon={icon} tint={tint} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <CaretRightIcon size={14} color={colors.textSecondary} weight="bold" />
    </Pressable>
  );
}

function GoalTile(p: { icon: Icon; tint: string; label: string; value: string; unit?: string; onPress: () => void; a11y: string }) {
  return (
    <Card style={styles.tile} onPress={p.onPress} accessibilityLabel={p.a11y}>
      <View style={styles.tileTop}>
        <IconTile icon={p.icon} tint={p.tint} />
        <CaretRightIcon size={14} color={colors.textSecondary} weight="bold" />
      </View>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {p.label}
      </Text>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {p.value}
        {p.unit ? <Text style={styles.tileUnit}> {p.unit}</Text> : null}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.sm },
  avatar: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bold, color: colors.textOnAccent },
  name: { ...type.display, fontSize: 24, color: colors.textPrimary, flex: 1 },
  editDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { gap: space.md, alignItems: 'stretch' },
  sheetAvatar: { alignSelf: 'center', marginTop: space.sm },
  camBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.control,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: { flexDirection: 'row', justifyContent: 'center', gap: space.xl },
  link: { fontFamily: fonts.semibold, fontSize: 15, color: colors.accent },
  fieldLabel: { ...type.caption, color: colors.textSecondary, marginTop: space.sm },
  input: {
    ...type.body,
    color: colors.textPrimary,
    backgroundColor: colors.control,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    marginBottom: space.sm,
  },
  stats: { flexDirection: 'row', marginTop: space.md, paddingHorizontal: 0 },
  stat: { flex: 1, gap: 6, minWidth: 0, paddingHorizontal: space.md },
  statBorder: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.cardStroke },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statLabel: { ...type.caption, color: colors.textSecondary, flexShrink: 1 },
  statValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.textPrimary },
  section: { marginTop: space.xxl },
  list: { marginTop: space.md, paddingVertical: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.sm },
  rowLabel: { ...type.body, color: colors.textPrimary },
  rowSub: { ...type.caption, color: colors.textSecondary, marginTop: 1 },
  iconTile: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  macroCard: { marginTop: space.md, gap: space.md },
  macroHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  macros: { flexDirection: 'row', gap: space.md },
  macro: { flex: 1, gap: 2 },
  macroValue: { fontFamily: fonts.bold, fontSize: 17, color: colors.textPrimary },
  macroBar: { height: 5, borderRadius: 3, marginTop: 6 },
  hint: { ...type.caption, color: colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  tile: { width: '48.8%', gap: space.sm, minHeight: 118 },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tileLabel: { ...type.caption, color: colors.textSecondary },
  tileValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.textPrimary },
  tileUnit: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
});
