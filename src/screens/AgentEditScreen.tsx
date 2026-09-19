import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCredentialGroups } from '../hooks/useCredentialGroups';
import { agentStore } from '../storage/metadataStore';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { PROVIDER_LABELS, PROVIDER_TYPES, type Agent, type ProviderType } from '../types/models';
import { generateId } from '../utils/id';

type Props = NativeStackScreenProps<RootStackParamList, 'AgentEdit'>;

const DEFAULT_BASE_URL: Record<ProviderType, string> = {
  ANTHROPIC: 'https://api.anthropic.com',
  OPENAI_COMPATIBLE: 'https://api.openai.com/v1',
  HERMES: 'http://localhost:8000',
  CUSTOM_WEBHOOK: 'https://',
};

export function AgentEditScreen({ navigation, route }: Props) {
  const agentId = route.params?.agentId;
  const isEditing = !!agentId;
  const { groups, refresh: refreshGroups } = useCredentialGroups();

  const [id] = useState(() => agentId ?? generateId());
  const [createdAtEpochMs, setCreatedAtEpochMs] = useState(() => Date.now());
  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState<ProviderType>('ANTHROPIC');
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL.ANTHROPIC);
  const [model, setModel] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [credentialGroupId, setCredentialGroupId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!agentId) return;
    agentStore.getById(agentId).then((agent) => {
      if (!agent) return;
      setName(agent.name);
      setProviderType(agent.providerType);
      setBaseUrl(agent.baseUrl);
      setModel(agent.model ?? '');
      setSystemPrompt(agent.systemPrompt ?? '');
      setCredentialGroupId(agent.credentialGroupId);
      setCreatedAtEpochMs(agent.createdAtEpochMs);
    });
  }, [agentId]);

  const save = async () => {
    if (!name.trim() || !baseUrl.trim()) return;
    const agent: Agent = {
      id,
      name: name.trim(),
      providerType,
      baseUrl: baseUrl.trim(),
      model: model.trim() || undefined,
      systemPrompt: systemPrompt.trim() || undefined,
      credentialGroupId,
      createdAtEpochMs,
    };
    await agentStore.save(agent);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerAction}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit agent' : 'New agent'}</Text>
        <TouchableOpacity onPress={save}>
          <Text style={[styles.headerAction, styles.headerSave]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Field label="Name">
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Claude — research"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Field label="Provider protocol">
          <View style={styles.chipRow}>
            {PROVIDER_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.chip, providerType === type && styles.chipSelected]}
                onPress={() => {
                  setProviderType(type);
                  if (!isEditing) setBaseUrl(DEFAULT_BASE_URL[type]);
                }}
              >
                <Text style={[styles.chipText, providerType === type && styles.chipTextSelected]}>
                  {PROVIDER_LABELS[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Base URL">
          <TextInput
            style={styles.input}
            value={baseUrl}
            onChangeText={setBaseUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://..."
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Field label="Model (optional)">
          <TextInput
            style={styles.input}
            value={model}
            onChangeText={setModel}
            autoCapitalize="none"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Field label="System prompt (optional)">
          <TextInput
            style={[styles.input, styles.multiline]}
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            multiline
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <View style={styles.credentialCard}>
          <Text style={styles.credentialTitle}>Shared session</Text>
          <Text style={styles.credentialBody}>
            Pick a saved credential to reuse its login. Any other agent on the same credential
            shares this session automatically.
          </Text>
          {groups.length === 0 ? (
            <Text style={styles.credentialEmpty}>No saved credentials yet.</Text>
          ) : (
            <View style={styles.chipRow}>
              {groups.map(({ group }) => (
                <TouchableOpacity
                  key={group.id}
                  style={[styles.chip, credentialGroupId === group.id && styles.chipSelected]}
                  onPress={() =>
                    setCredentialGroupId(credentialGroupId === group.id ? undefined : group.id)
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      credentialGroupId === group.id && styles.chipTextSelected,
                    ]}
                  >
                    {group.displayName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity
            onPress={() => {
              refreshGroups();
              navigation.navigate('Vault');
            }}
          >
            <Text style={styles.manageLink}>Manage credentials</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  headerAction: { fontSize: 15, color: colors.textMuted },
  headerSave: { color: colors.primary, fontWeight: '700' },
  form: { padding: 20, paddingBottom: 60 },
  field: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, color: colors.textMuted, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: colors.text },
  credentialCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  credentialTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  credentialBody: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  credentialEmpty: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  manageLink: { color: colors.secondary, fontWeight: '600', marginTop: 8 },
});
