import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import WebView, { type WebViewNavigation } from 'react-native-webview';
import { useBrowserProfiles } from '../hooks/useBrowserProfiles';
import { browserProfileStore } from '../storage/metadataStore';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import type { BrowserProfile } from '../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'Browser'>;

export function BrowserScreen({ navigation, route }: Props) {
  const { profileId } = route.params;
  const { recordVisit } = useBrowserProfiles();
  const webViewRef = useRef<WebView>(null);

  const [profile, setProfile] = useState<BrowserProfile | undefined>(undefined);
  const [nav, setNav] = useState<WebViewNavigation | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    browserProfileStore.getById(profileId).then(setProfile);
  }, [profileId]);

  if (!profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerAction}>Close</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {nav?.title || profile.name}
          </Text>
          <Text style={styles.headerUrl} numberOfLines={1}>
            {nav?.url ?? profile.homeUrl}
          </Text>
        </View>
        <TouchableOpacity onPress={() => webViewRef.current?.reload()}>
          <Text style={styles.headerAction}>Reload</Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: profile.lastUrl || profile.homeUrl }}
        style={styles.webview}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onNavigationStateChange={(event) => {
          setNav(event);
          if (!event.loading) {
            recordVisit(profile, event.url);
          }
        }}
        startInLoadingState
        sharedCookiesEnabled
        domStorageEnabled
      />

      <View style={styles.toolbar}>
        <ToolbarButton label="‹" disabled={!nav?.canGoBack} onPress={() => webViewRef.current?.goBack()} />
        <ToolbarButton label="›" disabled={!nav?.canGoForward} onPress={() => webViewRef.current?.goForward()} />
        <ToolbarButton label="⌂" onPress={() => webViewRef.current?.injectJavaScript(`window.location.href = ${JSON.stringify(profile.homeUrl)}; true;`)} />
      </View>
    </View>
  );
}

function ToolbarButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.toolbarButton} onPress={onPress} disabled={disabled}>
      <Text style={[styles.toolbarButtonText, disabled && styles.toolbarButtonTextDisabled]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 12,
  },
  headerTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  headerUrl: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  headerAction: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  loadingBar: { position: 'absolute', top: 100, alignSelf: 'center', zIndex: 2 },
  webview: { flex: 1, backgroundColor: colors.background },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toolbarButton: { paddingHorizontal: 24, paddingVertical: 6 },
  toolbarButtonText: { fontSize: 22, color: colors.text, fontWeight: '600' },
  toolbarButtonTextDisabled: { color: colors.neutral },
});
