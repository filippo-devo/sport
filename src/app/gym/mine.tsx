import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  BuildingsIcon,
  CheckIcon,
  GarageIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  NavigationArrowIcon,
  PlusIcon,
  StorefrontIcon,
  XIcon,
  type Icon,
} from '../../components/icons';
import { Badge, Button, Card, Divider, SectionTitle } from '../../components/ui/controls';
import { NavBar } from '../../components/ui/headers';
import { Screen } from '../../components/ui/layout';
import { Sheet } from '../../components/ui/sheets';
import type { GymKind, MyGym } from '../../data/types';
import { useT, type TKey } from '../../i18n';
import type { Position } from '../../lib/gyms';
import { formatDistance, nearbyGyms, searchGymsByName, type GymPlace } from '../../lib/gymSearch';
import { currentPosition } from '../../lib/location';
import { useStore } from '../../store';
import { colors, fonts, radius, space, type } from '../../theme/tokens';

const KIND_ICON: Record<GymKind, Icon> = { large: BuildingsIcon, small: StorefrontIcon, garage: GarageIcon };
const KINDS: GymKind[] = ['large', 'small', 'garage'];
const NO_GYMS: MyGym[] = [];

type Draft = { garage: boolean; place?: GymPlace; kind: GymKind; name: string; editId?: string };
type Status = 'idle' | 'locating' | 'loading' | 'ready' | 'denied' | 'noFix' | 'error';

/** "My gyms": search OpenStreetMap by name or list gyms nearby, pick one and say what kind of gym it is. */
export default function MyGymsScreen() {
  const { t, lang } = useT();
  const myGyms = useStore((s) => s.settings.myGyms ?? NO_GYMS);
  const setSettings = useStore((s) => s.setSettings);

  const [pos, setPos] = useState<Position | null>(null);
  const [nearby, setNearby] = useState<GymPlace[]>([]);
  const [nearStatus, setNearStatus] = useState<Status>('idle');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<{ key: string; status: Status; results: GymPlace[] }>({ key: '', status: 'idle', results: [] });
  const [draft, setDraft] = useState<Draft | null>(null);
  const reqId = useRef(0);
  const [retry, setRetry] = useState(0);

  const locate = useCallback(async () => {
    setNearStatus('locating');
    const { position, denied } = await currentPosition();
    if (!position) return setNearStatus(denied ? 'denied' : 'noFix');
    setPos(position);
    setNearStatus('loading');
    try {
      setNearby(await nearbyGyms(position));
      setNearStatus('ready');
    } catch {
      setNearStatus('error');
    }
  }, []);

  useEffect(() => {
    // Deferred so the first render isn't followed by a synchronous state update.
    const timer = setTimeout(locate, 0);
    return () => clearTimeout(timer);
  }, [locate]);

  // Debounced name search. The answer is stored with the query it belongs to, so a stale one is never shown.
  const q = query.trim();
  useEffect(() => {
    if (q.length < 2) return;
    const id = ++reqId.current;
    const timer = setTimeout(async () => {
      try {
        const r = await searchGymsByName(q, pos);
        if (id !== reqId.current) return;
        setSearch({ key: `${q}#${retry}`, status: 'ready', results: pos ? [...r].sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0)) : r });
      } catch {
        if (id === reqId.current) setSearch({ key: `${q}#${retry}`, status: 'error', results: [] });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [q, pos, retry]);
  const fresh = search.key === `${q}#${retry}`;
  const results = fresh ? search.results : [];
  const searchStatus: Status = q.length < 2 ? 'idle' : fresh ? search.status : 'loading';

  const saved = new Set(myGyms.map((g) => g.id));
  const save = (list: MyGym[]) => setSettings({ myGyms: list });

  const confirm = () => {
    if (!draft) return;
    if (draft.editId) {
      save(myGyms.map((g) => (g.id === draft.editId ? { ...g, kind: draft.kind, name: draft.garage ? draft.name.trim() || g.name : g.name } : g)));
    } else if (draft.place) {
      const p = draft.place;
      save([...myGyms, { id: p.id, name: p.name, kind: draft.kind, address: p.address, city: p.city, lat: p.lat, lng: p.lng, addedAt: Date.now() }]);
    } else {
      save([...myGyms, { id: `garage:${Date.now()}`, name: draft.name.trim() || t('myGym.garageDefault'), kind: 'garage', addedAt: Date.now() }]);
    }
    setDraft(null);
  };

  const editing = draft?.editId ? myGyms.find((g) => g.id === draft.editId) : undefined;
  const searching = q.length >= 2;
  const list = searching ? results : nearby;
  const dist = (m?: number) => formatDistance(m, lang);

  return (
    <Screen top={<NavBar title={t('myGym.title')} />}>
      {myGyms.length > 0 && (
        <>
          <SectionTitle title={t('myGym.yours')} />
          <Card style={styles.list}>
            {myGyms.map((g, i) => (
              <View key={g.id}>
                {i > 0 && <Divider />}
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                  onPress={() => setDraft({ garage: g.kind === 'garage', kind: g.kind, name: g.name, editId: g.id })}
                  accessibilityRole="button"
                  accessibilityLabel={g.name}
                >
                  <KindTile kind={g.kind} />
                  <View style={styles.rowText}>
                    <Text style={styles.name} numberOfLines={1}>
                      {g.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {[t(`myGym.kind.${g.kind}` as TKey), placeLine(g)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {i === 0 && <Badge label={t('myGym.main')} />}
                </Pressable>
              </View>
            ))}
          </Card>
        </>
      )}

      <SectionTitle style={myGyms.length > 0 ? styles.section : undefined} title={myGyms.length ? t('myGym.addAnother') : t('myGym.find')} />
      <View style={styles.search}>
        <MagnifyingGlassIcon size={18} color={colors.textSecondary} weight="bold" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('myGym.searchPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={t('myGym.searchPlaceholder')}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel={t('library.clear')}>
            <XIcon size={16} color={colors.textSecondary} weight="bold" />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.listHead}>
        {!searching && <NavigationArrowIcon size={14} color={colors.accent} weight="fill" />}
        <Text style={styles.listHeadText}>{searching ? t('myGym.results') : t('myGym.nearby')}</Text>
        {(searching ? searchStatus : nearStatus) === 'loading' || (!searching && nearStatus === 'locating') ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : null}
      </View>

      <StatusNote
        status={searching ? searchStatus : nearStatus}
        empty={list.length === 0}
        searching={searching}
        onRetry={searching ? () => setRetry((n) => n + 1) : locate}
      />

      {list.length > 0 && (
        <Card style={styles.list}>
          {list.map((g, i) => {
            const added = saved.has(g.id);
            return (
              <View key={g.id}>
                {i > 0 && <Divider />}
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                  disabled={added}
                  onPress={() => setDraft({ garage: false, place: g, kind: g.suggestedKind, name: g.name })}
                  accessibilityRole="button"
                  accessibilityLabel={g.name}
                >
                  <View style={styles.pinTile}>
                    <MapPinIcon size={18} color={colors.accent} weight="fill" />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.name} numberOfLines={1}>
                      {g.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {[dist(g.distanceM), placeLine(g)].filter(Boolean).join(' · ') || t('myGym.noAddress')}
                    </Text>
                  </View>
                  {added ? (
                    <CheckIcon size={20} color={colors.success} weight="bold" />
                  ) : (
                    <View style={styles.addDot}>
                      <PlusIcon size={16} color={colors.textPrimary} weight="bold" />
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })}
        </Card>
      )}

      <Card style={styles.garage} onPress={() => setDraft({ garage: true, kind: 'garage', name: t('myGym.garageDefault') })} accessibilityLabel={t('myGym.garageCta')}>
        <KindTile kind="garage" />
        <View style={styles.rowText}>
          <Text style={styles.name}>{t('myGym.garageCta')}</Text>
          <Text style={styles.meta}>{t('myGym.garageSub')}</Text>
        </View>
        <PlusIcon size={18} color={colors.textSecondary} weight="bold" />
      </Card>

      <Text style={styles.attribution}>{t('myGym.attribution')}</Text>

      <Sheet visible={!!draft} onClose={() => setDraft(null)} title={draft?.place && !editing ? draft.place.name : editing ? editing.name : t('myGym.garageCta')}>
        {draft && (
          <View style={{ gap: space.md }}>
            {draft.place && !editing && (
              <Text style={styles.meta}>{[dist(draft.place.distanceM), placeLine(draft.place)].filter(Boolean).join(' · ')}</Text>
            )}
            {draft.garage && (
              <TextInput
                value={draft.name}
                onChangeText={(name) => setDraft({ ...draft, name })}
                placeholder={t('myGym.garageDefault')}
                placeholderTextColor={colors.textSecondary}
                style={styles.nameInput}
                accessibilityLabel={t('myGym.nameLabel')}
              />
            )}
            {!draft.garage && (
              <>
                <Text style={styles.question}>{t('myGym.kindQuestion')}</Text>
                {KINDS.filter((k) => k !== 'garage').map((k) => (
                  <KindOption
                    key={k}
                    kind={k}
                    selected={draft.kind === k}
                    suggested={!editing && draft.place?.suggestedKind === k}
                    onPress={() => setDraft({ ...draft, kind: k })}
                  />
                ))}
              </>
            )}
            <Button label={editing ? t('myGym.save') : t('myGym.add')} icon={editing ? CheckIcon : PlusIcon} onPress={confirm} />
            {editing && (
              <View style={styles.sheetRow}>
                {myGyms[0]?.id !== editing.id && (
                  <Button
                    style={{ flex: 1 }}
                    variant="secondary"
                    label={t('myGym.makeMain')}
                    onPress={() => {
                      save([editing, ...myGyms.filter((g) => g.id !== editing.id)]);
                      setDraft(null);
                    }}
                  />
                )}
                <Button
                  style={{ flex: 1 }}
                  variant="danger"
                  label={t('myGym.remove')}
                  onPress={() => {
                    save(myGyms.filter((g) => g.id !== editing.id));
                    setDraft(null);
                  }}
                />
              </View>
            )}
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

const placeLine = (g: { address?: string; city?: string }) => [g.address, g.city].filter(Boolean).join(', ');

function StatusNote({ status, empty, searching, onRetry }: { status: Status; empty: boolean; searching: boolean; onRetry: () => void }) {
  const { t } = useT();
  let text: string | null = null;
  if (status === 'denied') text = t('myGym.locationDenied');
  else if (status === 'noFix') text = t('myGym.noFix');
  else if (status === 'error') text = t('myGym.error');
  else if (status === 'ready' && empty) text = searching ? t('myGym.noResults') : t('myGym.noneNearby');
  if (!text) return null;
  const retry = status === 'error' || status === 'noFix' || status === 'denied';
  return (
    <View style={styles.note}>
      <Text style={styles.noteText}>{text}</Text>
      {retry && <Button size="sm" variant="secondary" label={t('myGym.retry')} onPress={onRetry} />}
    </View>
  );
}

function KindTile({ kind }: { kind: GymKind }) {
  const Glyph = KIND_ICON[kind];
  return (
    <View style={styles.kindTile}>
      <Glyph size={18} color={colors.accent} weight="bold" />
    </View>
  );
}

function KindOption({ kind, selected, suggested, onPress }: { kind: GymKind; selected: boolean; suggested: boolean; onPress: () => void }) {
  const { t } = useT();
  return (
    <Pressable
      style={[styles.option, selected && styles.optionOn]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={t(`myGym.kind.${kind}` as TKey)}
    >
      <KindTile kind={kind} />
      <View style={styles.rowText}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text style={styles.name}>{t(`myGym.kind.${kind}` as TKey)}</Text>
          {suggested && <Badge label={t('myGym.suggested')} tone="muted" />}
        </View>
        <Text style={styles.meta}>{t(`myGym.kindSub.${kind}` as TKey)}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected && <CheckIcon size={12} color={colors.textOnAccent} weight="bold" />}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxl },
  list: { marginTop: space.md, paddingVertical: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  rowText: { flex: 1, minWidth: 0 },
  name: { ...type.itemTitle, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.md,
    height: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardStroke,
  },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.textPrimary, paddingVertical: 0, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as never } : null) },
  nameInput: {
    height: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textPrimary,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as never } : null),
  },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xl },
  listHeadText: { ...type.caption, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  pinTile: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent + '1F', alignItems: 'center', justifyContent: 'center' },
  kindTile: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.accent + '1F', alignItems: 'center', justifyContent: 'center' },
  addDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  garage: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg, paddingVertical: space.md },
  attribution: { ...type.caption, color: colors.textSecondary, marginTop: space.lg, textAlign: 'center', opacity: 0.7 },
  note: { marginTop: space.md, gap: space.sm, alignItems: 'flex-start' },
  noteText: { ...type.body, color: colors.textSecondary },
  question: { ...type.body, color: colors.textPrimary, marginTop: space.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionOn: { borderColor: colors.accent },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.track, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  sheetRow: { flexDirection: 'row', gap: space.sm },
});
