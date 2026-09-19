import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusChip } from '../components/StatusChip';
import { AGENT_TEMPLATES } from '../data/agentTemplates';
import { useAgents, type AgentWithStatus } from '../hooks/useAgents';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { PROVIDER_LABELS } from '../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const { agents, isLoading, refresh, deleteAgent } = useAgents();
  const [showAddModal, setShowAddModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const confirmDelete = (item: AgentWithStatus) => {
    Alert.alert('Remove agent?', `This deletes "${item.agent.name}" and its chat history.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteAgent(item.agent.id) },
    ]);
  };

  const openAgentEditor = (templateId?: string) => {
    setShowAddModal(false);
    navigation.navigate('AgentEdit', templateId ? { templateId } : {});
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>truOS Hub</Text>
          <Text style={styles.subtitle}>Your agents, one shared vault</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.vaultButton} onPress={() => navigation.navigate('Browsers')}>
            <Text style={styles.vaultButtonText}>Browsers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.vaultButton} onPress={() => navigation.navigate('Vault')}>
            <Text style={styles.vaultButtonText}>Vault</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!isLoading && agents.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No agents yet</Text>
          <Text style={styles.emptyBody}>
            Start from a template, add a credential in the Vault, and it's live.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setShowAddModal(true)}>
            <Text style={styles.primaryButtonText}>Add your first agent</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(item) => item.agent.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate('Chat', { agentId: item.agent.id })}
              onLongPress={() => confirmDelete(item)}
            >
              <View style={styles.cardMain}>
                <Text style={styles.cardTitle}>{item.agent.name}</Text>
                <Text style={styles.cardSubtitle}>{PROVIDER_LABELS[item.agent.providerType]}</Text>
                <View style={{ marginTop: 8 }}>
                  <StatusChip status={item.status} />
                </View>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('AgentEdit', { agentId: item.agent.id })}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </Pressable>
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddAgentModal visible={showAddModal} onClose={() => setShowAddModal(false)} onPick={openAgentEditor} />
    </View>
  );
}

function AddAgentModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (templateId?: string) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Add an agent</Text>
          <Text style={styles.modalSubtitle}>
            Pick a template to start pre-configured, or build one from scratch.
          </Text>
          {AGENT_TEMPLATES.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateRow}
              onPress={() => onPick(template.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.templateTitle}>{template.label}</Text>
                <Text style={styles.templateDesc}>{template.description}</Text>
              </View>
              <Text style={styles.templateChevron}>›</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.templateRow} onPress={() => onPick(undefined)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.templateTitle}>Start from scratch</Text>
              <Text style={styles.templateDesc}>Blank agent — pick everything yourself.</Text>
            </View>
            <Text style={styles.templateChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
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
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  headerButtons: { flexDirection: 'row', gap: 8 },
  vaultButton: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  vaultButtonText: { color: colors.secondary, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
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
  cardMain: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  cardSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  editButton: { paddingHorizontal: 12, paddingVertical: 6 },
  editButtonText: { color: colors.primary, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 20 },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  templateTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  templateDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  templateChevron: { fontSize: 20, color: colors.textMuted, paddingLeft: 8 },
  modalCancel: { marginTop: 16, alignItems: 'center' },
  modalCancelText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
});
