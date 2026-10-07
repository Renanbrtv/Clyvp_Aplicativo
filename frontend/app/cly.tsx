import { useCallback, useEffect, useState } from 'react';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { Image, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useAuth } from '../src/features/auth/auth-context';
import { api } from '../src/shared/api/client';
import { ApiError } from '../src/shared/api/types';
import { Button, Card, LoadingState, Screen, ScreenHeader } from '../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../src/shared/theme';

type Action = 'mensagem' | 'descricao' | 'proposta';
type Quota = { planCode: string; limit: number; used: number; remaining: number; blocked: boolean; resetsAt: string | null; nextWaitHours: number; consentRequired: boolean; busy: boolean };
type Status = { configured: boolean; quota: Quota };
const actions: { key: Action; label: string }[] = [{ key: 'mensagem', label: 'Preparar mensagem' }, { key: 'descricao', label: 'Melhorar descricao' }, { key: 'proposta', label: 'Rascunhar proposta' }];

export default function ClyScreen() {
  useThemeMode();
 const { user, status: authStatus } = useAuth(); const router = useRouter();
 const [status, setStatus] = useState<Status | null>(null); const [consent, setConsent] = useState(false);
 const [action, setAction] = useState<Action>('mensagem'); const [text, setText] = useState('');
 const [answer, setAnswer] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
 const [now, setNow] = useState(Date.now()); const [savingConsent, setSavingConsent] = useState(false);
 const load = useCallback(async () => {
   if (!user) return;
   try { const data = await api.get<Status>('/ai/status'); setStatus(data); setConsent(!data.quota.consentRequired); }
   catch (e) { setError(e instanceof Error ? e.message : 'Nao foi possivel consultar a Cly.'); }
 }, [user?.id]);
 useFocusEffect(useCallback(() => { void load(); }, [load]));
 useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
 const resetTime = status?.quota.resetsAt ? new Date(status.quota.resetsAt).getTime() : 0;
 useEffect(() => { if (status?.quota.blocked && resetTime && now >= resetTime) void load(); }, [Math.floor(now / 30000), resetTime]);
 if (authStatus === 'visitante') return <Redirect href="/login" />;
 if (authStatus === 'carregando') return <Screen><LoadingState /></Screen>;
 async function changeConsent(value: boolean) {
   setSavingConsent(true); setError('');
   try { await api.post('/ai/consent', { accepted: value }); await load(); }
   catch (e) { setError(e instanceof Error ? e.message : 'Nao foi possivel salvar sua escolha.'); }
   finally { setSavingConsent(false); }
 }
 async function generate() {
   setBusy(true); setError(''); setAnswer('');
   try { const result = await api.post<{ suggestion: string }>('/ai/generate', { action, text: text.trim() }); setAnswer(result.suggestion); }
   catch (e) { setError(e instanceof ApiError ? e.message : 'Nao foi possivel gerar. Tente novamente.'); }
   finally { await load(); setBusy(false); }
 }
 const wait = Math.max(0, Math.ceil((resetTime - now) / 60000));
 return <Screen scroll keyboardAware><ScreenHeader title="Perguntar a Cly" subtitle="Sua assistente de trabalho" />
   <View style={styles.body}>
     <View style={styles.welcome}><Image source={require('../assets/cly/cly.png')} style={styles.avatar} accessibilityLabel="Cly, mascote redonda laranja com um sorriso" />
       <Text style={styles.greeting}>Ola! Sou a Cly. Posso ajudar voce a preparar mensagens, organizar propostas e pensar no proximo passo.</Text></View>
     {!status && !error ? <LoadingState /> : null}
     {status && !status.configured ? <Card><Text style={styles.text}>A geracao pela Cly esta indisponivel. Voce pode continuar usando as mensagens prontas, sem IA.</Text><Button label="Mensagens prontas" variant="outline" onPress={() => router.push('/recuperacao')} /></Card> : null}
     <Card><Text style={styles.title}>Voce decide o que compartilhar</Text>
       <Text style={styles.text}>Ao gerar, o texto que voce escrever sera enviado a OpenAI para preparar uma sugestao. Nenhuma lista de clientes e anexada automaticamente. Evite senhas, documentos e dados pessoais desnecessarios. Nao guardamos o texto ou a resposta no historico da Cly no servidor; o provedor pode manter registros conforme sua politica.</Text>
       <View style={styles.consent}><Switch value={consent} disabled={busy || savingConsent || !status} onValueChange={value => void changeConsent(value)} accessibilityLabel="Autorizar envio do texto a OpenAI" /><Text style={styles.text}>Autorizo o envio do texto para gerar sugestoes. Posso retirar esta autorizacao aqui.</Text></View>
       <Button label="Politica de privacidade" variant="ghost" onPress={() => router.push('/privacidade')} />
     </Card>
     {status ? <Card><Text style={styles.title}>Seu uso da Cly</Text><Text style={styles.text}>{status.quota.used} de {status.quota.limit} geracoes {status.quota.planCode === 'free' ? 'nesta rodada' : 'neste mes (UTC)'}</Text>
       {status.quota.blocked ? <><Text style={styles.text}>Liberacao: {resetTime ? new Date(resetTime).toLocaleString('pt-BR') : 'consulte novamente'}. Faltam {Math.floor(wait / 60)}h {wait % 60}min.</Text><Button label="Conhecer Pro e Pro Plus" onPress={() => router.push('/planos')} /></> : status.quota.planCode === 'free' ? <Text style={styles.caption}>Ao concluir esta rodada, a espera sera de {status.quota.nextWaitHours} horas. Tentativas bloqueadas nao aumentam a espera.</Text> : null}
     </Card> : null}
     <View style={styles.actions}>{actions.map(item => <Button key={item.key} label={item.label} size="small" variant={action === item.key ? 'primary' : 'outline'} onPress={() => setAction(item.key)} disabled={busy} />)}</View>
     <Text style={styles.title}>O que voce precisa preparar?</Text>
     <TextInput accessibilityLabel="Texto para a Cly" multiline maxLength={2000} value={text} onChangeText={setText} editable={!busy} placeholder="Descreva o servico e informe apenas valores e condicoes que voce ja definiu." placeholderTextColor={theme.colors.textMuted} style={styles.input} />
     <Text style={styles.caption}>{text.length}/2000 caracteres. Revise os dados antes de gerar.</Text>
     {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
     <Button label="Gerar sugestao" loading={busy} disabled={!status?.configured || !consent || savingConsent || status.quota.blocked || text.trim().length < 2} onPress={() => void generate()} />
     {error && !status ? <Button label="Tentar carregar novamente" onPress={() => void load()} /> : null}
     {answer ? <Card><Text style={styles.title}>Sugestao — revise antes de usar</Text><Text selectable style={styles.text}>{answer}</Text><Button label="Revisar e compartilhar" variant="outline" onPress={() => { void Share.share({ message: answer }).catch(() => setError('Selecione o texto para copiar.')); }} /><Text style={styles.caption}>Nada e enviado ou salvo em um cliente automaticamente.</Text></Card> : null}
     <Text style={styles.caption}>Cly usa IA e pode cometer erros. Confira nomes, valores e condicoes. O acesso aos seus dados continua disponivel quando a cota acaba.</Text>
   </View>
 </Screen>;
}
const styles = createThemedStyles(() => ({ body: { gap: 18, paddingTop: 16 }, welcome: { flexDirection: 'row', gap: 14, alignItems: 'center' }, avatar: { width: 76, height: 76, borderRadius: 38 }, greeting: { flex: 1, color: theme.colors.text, fontSize: 16, lineHeight: 24 }, title: { color: theme.colors.text, fontWeight: '700', fontSize: 17, marginBottom: 8 }, text: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 23, flexShrink: 1 }, caption: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20 }, consent: { flexDirection: 'row', gap: 12, marginVertical: 12 }, actions: { gap: 8 }, input: { minHeight: 150, textAlignVertical: 'top', color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 16 }, error: { color: theme.colors.danger, fontSize: 15 } }));
