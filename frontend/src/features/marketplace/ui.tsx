import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, Redirect, useRouter } from 'expo-router';
import { Image, Platform, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '../auth/auth-context';
import { api } from '../../shared/api/client';
import {
  Button as BaseButton,
  Card as BaseCard,
  ErrorState,
  LoadingState,
  Screen,
  ScreenHeader,
} from '../../shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../shared/theme';
export { api, Text, View, Image, theme };
export function Button(props: React.ComponentProps<typeof BaseButton>) {
  return <BaseButton labelLines={2} {...props} />;
}
export function Card({ style, ...props }: React.ComponentProps<typeof BaseCard>) {
  return <BaseCard {...props} style={[{ gap: 12 }, style]} />;
}
export const CATEGORIES = [
  'Tecnico de informatica',
  'Manutencao de celular',
  'Instalacao de cameras',
  'Eletricista',
  'Encanador',
  'Designer',
  'Editor de video',
  'Programador',
  'Criador de sites',
  'Fotografo',
  'Professor / aulas particulares',
  'Social media',
  'Manutencao',
  'Montagem de moveis',
  'Servicos domesticos',
  'Entregas',
  'Pet sitter',
  'Outros',
];
export const currency = (n: any) =>
  Number(n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const moneyInput = (n: any) => (n == null ? '' : Number(n).toFixed(2).replace('.', ','));
export { amount } from './money';
export const coordinate = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : null);
export const day = (v: any) => (v ? String(v).slice(0, 10) : 'A combinar');
export const prettyDay = (v: any) => (v ? day(v).split('-').reverse().join('/') : 'A combinar');
export const parse = (v: any, fallback: any = []) =>
  typeof v === 'string' ? JSON.parse(v) : (v ?? fallback);
export function useData(path: string) {
  const [data, setData] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      setData(await api.get(path));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nao foi possivel carregar.');
    } finally {
      setLoading(false);
    }
  }, [path]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  return { data, loading, error, load };
}
export function useAction(reload?: () => Promise<void>) {
  const running = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const run = async (fn: () => Promise<unknown>, message = 'Alteracao salva.') => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      if (reload) await reload();
      setNotice(message);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message + ((e as any).details?.map((x: any) => ` ${x.field}: ${x.message}`).join('') ?? '')
          : 'Tente novamente.',
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return { busy, error, notice, run };
}
export function MarketScreen({
  title,
  subtitle,
  children,
  loading,
  error,
  retry,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  loading?: boolean;
  error?: string;
  retry?: () => void;
}) {
  useThemeMode();
  const { status } = useAuth();
  if (status === 'visitante') return <Redirect href="/(auth)/login" />;
  return (
    <Screen scroll keyboardAware>
      <ScreenHeader title={title} titleLines={2} subtitle={subtitle} />
      <View style={styles.body}>
        {loading || status === 'carregando' ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : (
          children
        )}
      </View>
    </Screen>
  );
}
export function Field({ label, multiline, ...props }: TextInputProps & { label: string }) {
  useThemeMode();
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, multiline && { minHeight: 110, textAlignVertical: 'top' }]}
      />
    </View>
  );
}
export function Choices({
  label,
  options,
  value,
  onChange,
  multi = false,
}: {
  label: string;
  options: string[];
  value: string | string[];
  onChange: (v: any) => void;
  multi?: boolean;
}) {
  useThemeMode();
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((v) => {
          const selected = Array.isArray(value) ? value.includes(v) : v === value;
          return (
            <Pressable
              key={v}
              accessibilityRole={multi ? 'checkbox' : 'radio'}
              accessibilityLabel={v}
              accessibilityState={{ checked: selected }}
              onPress={() =>
                onChange(
                  multi
                    ? selected
                      ? (value as string[]).filter((x) => x !== v)
                      : [...(value as string[]), v]
                    : v,
                )
              }
              style={[styles.chip, selected && styles.selected]}
            >
              <Text style={{ color: selected ? theme.colors.primaryInk : theme.colors.text }}>{v}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
export function Note({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  useThemeMode();
  return (
    <Text accessibilityLiveRegion="polite" style={[styles.text, error && { color: theme.colors.danger }]}>
      {children}
    </Text>
  );
}
export function Feedback({ action }: { action: ReturnType<typeof useAction> }) {
  return (
    <>
      {action.error ? <Note error>{action.error}</Note> : null}
      {action.notice ? <Note>{action.notice}</Note> : null}
    </>
  );
}
export function Confirm({
  label,
  description,
  onConfirm,
  disabled = false,
}: {
  label: string;
  description: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return open ? (
    <Card>
      <Note>{description}</Note>
      <View style={{ gap: 8, marginTop: 12 }}>
        <Button
          label="Confirmar"
          disabled={disabled}
          onPress={() => {
            setOpen(false);
            onConfirm();
          }}
        />
        <Button label="Voltar" variant="ghost" onPress={() => setOpen(false)} />
      </View>
    </Card>
  ) : (
    <Button label={label} variant="outline" disabled={disabled} onPress={() => setOpen(true)} />
  );
}
export function MarketLinks() {
  const router = useRouter();
  return (
    <View style={{ gap: 8 }}>
      <Button
        label="Minhas propostas e trabalhos"
        variant="outline"
        onPress={() => router.push('/mercado/minhas')}
      />
      <Button
        label="Meu perfil profissional"
        variant="ghost"
        onPress={() => router.push('/mercado/perfil-profissional')}
      />
    </View>
  );
}
export function Picture({
  value,
  onChange,
  label = 'Adicionar foto',
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  label?: string;
}) {
  const [error, setError] = useState('');
  async function pick() {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if ((asset.size ?? 0) > 250000) throw new Error('Use PNG ou JPEG de ate 250 KB.');
      let data: string;
      if (Platform.OS === 'web') {
        data = asset.base64 ?? asset.uri;
        if (!data.startsWith('data:')) {
          data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error('Falha ao ler imagem'));
            reader.readAsDataURL(asset.file!);
          });
        }
      } else {
        data = `data:${asset.mimeType ?? 'image/jpeg'};base64,${await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 })}`;
      }
      if (data.length > 350000) throw new Error('Use uma imagem de ate 250 KB.');
      onChange(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nao foi possivel abrir a imagem.');
    }
  }
  return (
    <View style={{ gap: 8 }}>
      {value ? (
        <>
          <Image
            source={{ uri: value }}
            style={{ width: 120, height: 120, borderRadius: 18 }}
            accessibilityLabel="Imagem selecionada"
          />
          <Button label="Remover imagem" variant="ghost" onPress={() => onChange(null)} />
        </>
      ) : null}
      <Button label={label} variant="outline" onPress={() => void pick()} />
      <Note>PNG ou JPEG, ate 250 KB. Nao inclua documentos ou dados particulares.</Note>
      {error ? <Note error>{error}</Note> : null}
    </View>
  );
}
export const styles = createThemedStyles(() => ({
  body: { gap: 18, paddingTop: 20, paddingBottom: 24 },
  title: { fontSize: 21, fontWeight: '700', color: theme.colors.text },
  label: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  text: { fontSize: 15, lineHeight: 23, color: theme.colors.textSecondary },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 13,
    padding: 13,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    fontSize: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  selected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceSoft },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  price: { fontSize: 22, fontWeight: '700', color: theme.colors.primary },
  card: { gap: 9 },
  image: { width: '100%', height: 220, borderRadius: 16 },
  metric: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
}));
