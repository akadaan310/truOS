import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBrowserProfiles } from '../hooks/useBrowserProfiles';
import { useCredentialGroups } from '../hooks/useCredentialGroups';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { BROWSER_PRESETS } from '../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'Browsers'>;

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function BrowsersScreen({ navigation }: Props) {
  const { profiles, createProfile, deleteProfile } = useBrowserProfiles();
  const { groups } = useCredentialGroups();
  const [showCreate, setShowCreate] = useState(false);
  const [prefill, setPrefill] = useState<{ name: string; homeUrl: string } | undefined>(undefined);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerAction}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Browsers</Text>
        <TouchableOpacity
          onPress={() => {
            setPrefill(undefined);
            setShowCreate(true);
          }}
        >
          <Text style={[styles.headerAction, styles.headerAdd]}>Add</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.intro}>
        Sign into web-only AI products right here — ChatGPT, Claude.ai, Perplexity, or anything
        else without a public API. Each tab keeps its own login the same way a normal browser
        tab would; file it under a credential group just to keep the hub organized.
      </Text>

      <View style={styles.presetRow}>
        {BROWSER_PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset.name}
            style={styles.presetChip}
            onPress={() => {
              setPrefill(preset);
              setShowCreate(true);
            }}
          >
            <Text style={styles.presetChipText}>+ {preset.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No browser tabs yet — add one above to sign in.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Browser', { profileId: item.id })}
            onLongPress={() =>
              Alert.alert('Remove browser tab?', `This deletes "${item.name}" from the hub.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => deleteProfile(item.id) },
              ])
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>{hostnameOf(item.lastUrl ?? item.homeUrl)}</Text>
              {item.credentialGroupId && (
                <Text style={styles.cardCredential}>
                  {groups.find((g) => g.group.id === item.credentialGroupId)?.group.displayName ??
                    'Linked credential'}
                </Text>
              )}
            </View>
            <Text style={styles.cardOpen}>Open ›</Text>
          </TouchableOpacity>
        )}
      />

      <CreateBrowserModal
        visible={showCreate}
        prefill={prefill}
        credentialGroups={groups.map((g) => g.group)}
        onClose={() => setShowCreate(false)}
        onCreate={async (name, homeUrl, credentialGroupId) => {
          const profile = await createProfile(name, homeUrl, credentialGroupId);
          setShowCreate(false);
          if (profile) navigation.navigate('Browser', { profileId: profile.id });
        }}
      />
    </View>
  );
}

function CreateBrowserModal({
  visible,
  prefill,
  credentialGroups,
  onClose,
  onCreate,
}: {
  visible: boolean;
  prefill?: { name: string; homeUrl: string };
  credentialGroups: { id: string; displayName: string }[];
  onClose: () => void;
  onCreate: (name: string, homeUrl: string, credentialGroupId?: string) => void;
}) {
  const [name, setName] = useState(prefill?.name ?? '');
  const [homeUrl, setHomeUrl] = useState(prefill?.homeUrl ?? 'https://');
  const [credentialGroupId, setCredentialGroupId] = useState<string | undefined>(undefined);

  const reset = () => {
    setName('');
    setHomeUrl('https://');
    setCredentialGroupId(undefined);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      onShow={() => {
        setName(prefill?.name ?? '');
        setHomeUrl(prefill?.homeUrl ?? 'https://');
      }}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>New browser tab</Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. ChatGPT — personal"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={homeUrl}
            onChangeText={setHomeUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://..."
            placeholderTextColor={colors.textMuted}
          />

          {credentialGroups.length > 0 && (
            <>
              <Text style={styles.fieldLabel}>File under credential (optional)</Text>
              <View style={styles.chipRow}>
                {credentialGroups.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.chip, credentialGroupId === g.id && styles.chipSelected]}
                    onPress={() =>
                      setCredentialGroupId(credentialGroupId === g.id ? undefined : g.id)
                    }
                  >
                    <Text
                      style={[styles.chipText, credentialGroupId === g.id && styles.chipTextSelected]}
                    >
                      {g.displayName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={() => {
                onClose();
                reset();
              }}
            >
              <Text style={styles.actionTextMuted}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onCreate(name, homeUrl, credentialGroupId);
                reset();
              }}
            >
              <Text style={styles.actionText}>Add & open</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerAction: { fontSize: 15, color: colors.textMuted },
  headerAdd: { color: colors.primary, fontWeight: '700' },
  intro: { fontSize: 13, color: colors.textMuted, paddingHorizontal: 20, lineHeight: 18, marginBottom: 14 },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  presetChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  presetChipText: { color: colors.secondary, fontWeight: '600', fontSize: 13 },
  list: { paddingHorizontal: 20, paddingBottom: 60 },
  empty: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  cardCredential: { fontSize: 12, color: colors.secondary, marginTop: 4, fontWeight: '600' },
  cardOpen: { color: colors.primary, fontWeight: '700' },
  input: {
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    marginBottom: 10,
  },
  fieldLabel: { fontSize: 13, color: colors.textMuted, marginBottom: 8, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelected: { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextSelected: { color: colors.text },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginTop: 8 },
  actionText: { color: colors.secondary, fontWeight: '700', fontSize: 14 },
  actionTextMuted: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
});
