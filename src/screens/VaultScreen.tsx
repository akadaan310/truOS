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
import { useCredentialGroups, type CredentialGroupWithDetails } from '../hooks/useCredentialGroups';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { AUTH_KINDS, AUTH_KIND_LABELS, type AuthKind } from '../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'Vault'>;

export function VaultScreen({ navigation }: Props) {
  const { groups, createGroup, updateSecret, revoke, deleteGroup } = useCredentialGroups();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerAction}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shared session vault</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)}>
          <Text style={[styles.headerAction, styles.headerAdd]}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.group.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.intro}>
            Every credential here is encrypted with the platform keystore. Point more than one
            agent at the same credential to share that login instead of signing in again.
          </Text>
        }
        renderItem={({ item }) => (
          <CredentialCard
            item={item}
            onRotate={(secret) => updateSecret(item.group, secret)}
            onRevoke={() => revoke(item.group)}
            onDelete={() =>
              Alert.alert('Delete credential?', `This removes "${item.group.displayName}".`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteGroup(item.group) },
              ])
            }
          />
        )}
      />

      <CreateCredentialModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={(name, kind, secret) => {
          createGroup(name, kind, secret);
          setShowCreate(false);
        }}
      />
    </View>
  );
}

function CredentialCard({
  item,
  onRotate,
  onRevoke,
  onDelete,
}: {
  item: CredentialGroupWithDetails;
  onRotate: (secret: string) => void;
  onRevoke: () => void;
  onDelete: () => void;
}) {
  const [rotating, setRotating] = useState(false);
  const [secret, setSecret] = useState('');

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.group.displayName}</Text>
          <Text style={styles.cardSubtitle}>{AUTH_KIND_LABELS[item.group.authKind]}</Text>
        </View>
        <TouchableOpacity onPress={onDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.secretStatus, { color: item.hasSecret ? colors.success : colors.danger }]}>
        {item.hasSecret ? 'Secret saved' : 'No secret saved yet'}
      </Text>

      <Text style={styles.sharedBy}>
        {item.sharedByAgents.length === 0
          ? 'Not used by any agent yet.'
          : `Shared session used by: ${item.sharedByAgents.map((a) => a.name).join(', ')}`}
      </Text>

      {item.filedBrowsers.length > 0 && (
        <Text style={styles.sharedBy}>
          Browser tabs filed here: {item.filedBrowsers.map((b) => b.name).join(', ')}
        </Text>
      )}

      {rotating && (
        <TextInput
          style={styles.input}
          value={secret}
          onChangeText={setSecret}
          placeholder="New secret"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() => {
            if (rotating) {
              onRotate(secret);
              setSecret('');
            }
            setRotating(!rotating);
          }}
        >
          <Text style={styles.actionText}>{rotating ? 'Save secret' : 'Rotate / set secret'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRevoke}>
          <Text style={styles.actionTextMuted}>Revoke</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CreateCredentialModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, kind: AuthKind, secret: string) => void;
}) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AuthKind>('API_KEY');
  const [secret, setSecret] = useState('');

  const reset = () => {
    setName('');
    setKind('API_KEY');
    setSecret('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>New shared credential</Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Work Anthropic account"
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.chipRow}>
            {AUTH_KINDS.map((k) => (
              <TouchableOpacity
                key={k}
                style={[styles.chip, kind === k && styles.chipSelected]}
                onPress={() => setKind(k)}
              >
                <Text style={[styles.chipText, kind === k && styles.chipTextSelected]}>
                  {AUTH_KIND_LABELS[k]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            value={secret}
            onChangeText={setSecret}
            placeholder="Secret (API key / token)"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
          />

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
                onCreate(name, kind, secret);
                reset();
              }}
            >
              <Text style={styles.actionText}>Create</Text>
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
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerAction: { fontSize: 15, color: colors.textMuted },
  headerAdd: { color: colors.primary, fontWeight: '700' },
  list: { padding: 20, paddingBottom: 60 },
  intro: { fontSize: 13, color: colors.textMuted, marginBottom: 16, lineHeight: 18 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  deleteText: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  secretStatus: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  sharedBy: { fontSize: 13, color: colors.textMuted, marginBottom: 10 },
  cardActions: { flexDirection: 'row', gap: 20 },
  actionText: { color: colors.secondary, fontWeight: '700', fontSize: 14 },
  actionTextMuted: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginTop: 8 },
});
