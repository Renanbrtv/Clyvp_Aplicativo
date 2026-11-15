import { useCallback, useRef, useState } from 'react';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../src/shared/api/client';
import { useAuth } from '../src/features/auth/auth-context';
import { theme, useThemeMode, createThemedStyles } from '../src/shared/theme';

type Message = { id: number; who: 'user' | 'cly'; text: string };
type Thread = { id: number; title: string; messages: Message[] };
type Quota = { limit: number; used: number; blocked: boolean; consentRequired: boolean; resetsAt: string | null };
type Status = { configured: boolean; quota: Quota };
const prompts = [
  { label: 'Preparar mensagem', text: 'Me ajude a preparar uma mensagem profissional para um cliente.' },
  { label: 'Melhorar descrição', text: 'Quero melhorar a descrição de um serviço. O que você precisa saber?' },
  { label: 'Rascunhar proposta', text: 'Quero rascunhar uma proposta comercial. Quais informações você precisa?' },
];
let serial = 0;
const key = () => ++serial;
const initial = (): Thread => ({ id: key(), title: 'Nova conversa', messages: [] });

export default function ClyScreen() {
  useThemeMode();
  const { status: authStatus, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [threads, setThreads] = useState<Thread[]>(() => [initial()]);
  const [selected, setSelected] = useState(0);
  const [history, setHistory] = useState(false);
  const [draft, setDraft] = useState('');
  const [state, setState] = useState<Status | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const scroller = useRef<ScrollView>(null);
  const thread = threads[selected];
  const colors = theme.colors;
  const load = useCallback(async () => {
    if (!user) return;
    try { setState(await api.get<Status>('/ai/status')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível consultar a Cly.'); }
  }, [user?.id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (authStatus === 'visitante') return <Redirect href="/login" />;
  if (authStatus === 'carregando') return <View style={styles.center}><ActivityIndicator /></View>;

  function append(id: number, message: Message) {
    setThreads(items => items.map(t => t.id === id ? { ...t, title: t.messages.length === 0 ? message.text.slice(0, 38) : t.title, messages: [...t.messages, message] } : t));
  }
  function reset() { generation.current++; setBusy(false); setThreads(t => [...t, initial()]); setSelected(threads.length); setDraft(''); setError(''); setHistory(false); }
  async function send(text = draft) {
    const value = text.trim();
    if (value.length < 2 || busy || !state?.configured || state.quota.blocked) return;
    if (state.quota.consentRequired) { setError('Autorize o envio das mensagens à IA antes de conversar.'); return; }
    const id = thread.id, ticket = ++generation.current;
    const prior = thread.messages.slice(-5).map(m => `${m.who === 'user' ? 'Usuário' : 'Cly'}: ${m.text.slice(0, 240)}`).join('\n');
    const context = `${prior}\nUsuário: ${value}`.slice(-2000);
    append(id, { id: key(), who: 'user', text: value }); setDraft(''); setError(''); setBusy(true);
    try {
      const result = await api.post<{ suggestion: string }>('/ai/generate', { action: 'mensagem', text: context });
      if (ticket === generation.current) append(id, { id: key(), who: 'cly', text: result.suggestion });
    } catch (e) { if (ticket === generation.current) setError(e instanceof Error ? e.message : 'Não foi possível responder.'); }
    finally { if (ticket === generation.current) setBusy(false); void load(); }
  }
  async function consent() {
    try { await api.post('/ai/consent', { accepted: true }); await load(); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao registrar autorização.'); }
  }
  const lastUser = [...thread.messages].reverse().find(m => m.who === 'user');
  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={[styles.header, { paddingTop: Math.max(10, insets.top) }]}>
      <Pressable onPress={() => router.back()} accessibilityLabel="Voltar" style={styles.icon}><Feather name="arrow-left" size={21} color={colors.text} /></Pressable>
      <Image source={require('../assets/cly/cly.png')} style={styles.headerMascot}/>
      <View style={styles.heading}><Text style={styles.headingTitle}>Cly</Text><Text style={styles.sub}>Sua assistente de trabalho</Text></View>
      <Pressable onPress={() => setHistory(h => !h)} accessibilityLabel="Histórico" style={styles.icon}><Feather name="clock" size={20} color={colors.text}/></Pressable>
      <Pressable onPress={reset} accessibilityLabel="Nova conversa" style={styles.icon}><Feather name="edit" size={20} color={colors.text}/></Pressable>
    </View>
    {history ? <ScrollView style={styles.body} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Histórico desta sessão</Text>
      {threads.map((t, i) => <Pressable key={t.id} style={styles.historyItem} onPress={() => { generation.current++; setBusy(false); setSelected(i); setHistory(false); }}><Feather name="message-square" size={16} color={colors.textSecondary}/><Text style={styles.text}>{t.title}</Text></Pressable>)}
      <Text style={styles.note}>As conversas desta versão não são salvas ao fechar o aplicativo.</Text>
    </ScrollView> : <ScrollView ref={scroller} style={styles.body} contentContainerStyle={[styles.scroll, !thread.messages.length && styles.empty]} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })} keyboardShouldPersistTaps="handled">
      {!thread.messages.length ? <View style={styles.welcome}>
        <Image source={require('../assets/cly/cly.png')} style={styles.mascot} resizeMode="contain" />
        <Text style={styles.title}>Olá, eu sou a Cly!</Text>
        <Text style={styles.intro}>Estou aqui para facilitar seu trabalho. Como posso te ajudar hoje?</Text>
        <View style={styles.suggestions}>{prompts.map(p => <Pressable key={p.label} style={styles.suggestion} onPress={() => setDraft(p.text)}><Text style={styles.text}>{p.label}</Text><Feather name="arrow-up-right" size={17} color={colors.textSecondary}/></Pressable>)}</View>
      </View> : thread.messages.map(m => <View key={m.id} style={[styles.messageRow, m.who === 'user' && styles.right]}>
        {m.who === 'cly' && <Image source={require('../assets/cly/cly.png')} style={styles.smallMascot} />}
        <View style={[styles.bubble, m.who === 'user' ? styles.userBubble : styles.clyBubble]}><Text selectable style={styles.message}>{m.text}</Text>
          {m.who === 'cly' && <Pressable style={styles.copy} onPress={() => void Share.share({ message: m.text })}><Feather name="copy" size={14} color={colors.textSecondary}/><Text style={styles.note}>Compartilhar / copiar</Text></Pressable>}
        </View>
      </View>)}
      {busy && <View style={styles.pending}><ActivityIndicator color={colors.primary} size="small"/><Text style={styles.note}>Cly está respondendo…</Text></View>}
    </ScrollView>}
    <View style={[styles.footer, { paddingBottom: Math.max(10, insets.bottom) }]}>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {state && !state.configured && <Text style={styles.note}>A IA ainda precisa ser configurada no backend. As mensagens prontas continuam disponíveis.</Text>}
      {state?.quota.consentRequired && <Pressable style={styles.notice} onPress={() => void consent()}><Feather name="shield" size={17} color={colors.primaryInk}/><Text style={styles.text}>Autorizar envio das minhas mensagens à IA</Text></Pressable>}
      {state?.quota.blocked && <Pressable style={styles.notice} onPress={() => router.push('/planos')}><Text style={styles.text}>Limite atingido. Conhecer os planos</Text></Pressable>}
      <View style={styles.composer}>
        <Pressable accessibilityLabel="Adicionar conteúdo" onPress={() => setError('Anexos estarão disponíveis em uma atualização futura.')} style={styles.icon}><Feather name="plus" size={21} color={colors.textSecondary}/></Pressable>
        <TextInput multiline maxLength={1500} value={draft} editable={!busy} onChangeText={setDraft} placeholder="Pergunte à Cly..." placeholderTextColor={colors.textMuted} style={styles.input}/>
        <Pressable accessibilityLabel={busy ? 'Interromper exibição' : 'Enviar'} style={[styles.send, (!busy && (!state?.configured || state.quota.blocked || draft.trim().length < 2)) && styles.disabled]} onPress={busy ? () => { generation.current++; setBusy(false); setError('Exibição interrompida; a solicitação pode continuar no servidor.'); } : () => void send()}><Feather name={busy ? 'square' : 'arrow-up'} size={19} color="#fff"/></Pressable>
      </View>
      <View style={styles.footerBottom}><Text style={styles.note}>A Cly pode errar. Confira nomes, prazos e valores.</Text>{lastUser && !busy && <Pressable onPress={() => setDraft(lastUser.text)}><Text style={styles.retry}>Repetir pergunta</Text></Pressable>}</View>
      {state && <Text style={styles.quota}>{state.quota.used}/{state.quota.limit} gerações usadas</Text>}
    </View>
  </KeyboardAvoidingView>;
}
const styles = createThemedStyles(() => ({
  page: { flex: 1, backgroundColor: theme.colors.background }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, paddingHorizontal: 9, paddingBottom: 10 },
  icon: { width: 39, height: 42, alignItems: 'center', justifyContent: 'center' }, headerMascot: { width: 35, height: 35 },
  heading: { flex: 1, paddingLeft: 7 }, headingTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700' }, sub: { color: theme.colors.textSecondary, fontSize: 12 },
  body: { flex: 1 }, scroll: { paddingHorizontal: 17, paddingVertical: 18, flexGrow: 1, gap: 15 }, empty: { justifyContent: 'center' },
  welcome: { alignItems: 'center', paddingBottom: 25 }, mascot: { height: 110, width: 110, marginBottom: 13 },
  title: { color: theme.colors.text, fontSize: 23, fontWeight: '700', marginBottom: 9 }, intro: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  suggestions: { width: '100%', gap: 10, marginTop: 26 }, suggestion: { borderColor: theme.colors.border, borderWidth: 1, padding: 14, borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between' },
  text: { color: theme.colors.text, fontSize: 14, flexShrink: 1 }, messageRow: { flexDirection: 'row', gap: 7, alignItems: 'flex-start' }, right: { justifyContent: 'flex-end' }, smallMascot: { width: 25, height: 25 },
  bubble: { maxWidth: '84%' }, userBubble: { borderRadius: 15, padding: 13, backgroundColor: theme.colors.surfaceSoftStrong }, clyBubble: { flex: 1, paddingVertical: 7 },
  message: { color: theme.colors.text, fontSize: 15, lineHeight: 24 }, copy: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8 }, pending: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  footer: { paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, paddingTop: 9, gap: 7 },
  composer: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 22, padding: 5, flexDirection: 'row', alignItems: 'flex-end', minHeight: 53 },
  input: { flex: 1, fontSize: 15, color: theme.colors.text, lineHeight: 22, minHeight: 40, maxHeight: 122, paddingTop: 9, paddingBottom: 8, paddingHorizontal: 7, textAlignVertical: 'center' },
  send: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary }, disabled: { opacity: 0.4 },
  footerBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 }, note: { color: theme.colors.textMuted, fontSize: 11, flexShrink: 1 }, retry: { color: theme.colors.primaryInk, fontSize: 11, fontWeight: '600' },
  error: { color: theme.colors.danger, fontSize: 12 }, notice: { backgroundColor: theme.colors.surfaceSoft, borderRadius: 10, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  quota: { textAlign: 'center', color: theme.colors.textMuted, fontSize: 10 }, historyItem: { flexDirection: 'row', gap: 12, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border }
}));
