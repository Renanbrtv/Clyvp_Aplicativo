import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { Linking, Switch, Text, View } from 'react-native';
import { useAuth } from '../src/features/auth/auth-context';
import { reminders } from '../src/features/notifications/reminders';
import { Button, Input, Screen, ScreenHeader } from '../src/shared/components';
import { theme, useThemeMode } from '../src/shared/theme';
export default function LembretesCelularScreen() {
 useThemeMode(); const { user, status } = useAuth();
 const [enabled, setEnabled] = useState(false), [time, setTime] = useState('09:00'), [busy, setBusy] = useState(false), [ready, setReady] = useState(false), [message, setMessage] = useState('');
 useEffect(() => { if (user) void reminders.read(user.id).then(s => { setEnabled(s.enabled); setTime(`${String(s.hour).padStart(2,'0')}:${String(s.minute).padStart(2,'0')}`); }).catch(() => setMessage('Nao foi possivel ler suas preferencias.')).finally(() => setReady(true)); }, [user?.id]);
 if (status === 'visitante') return <Redirect href="/(auth)/login" />;
 async function save() {
  if (!user || busy) return;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { setMessage('Use o formato 09:00, de 00:00 a 23:59.'); return; }
  setBusy(true); setMessage('');
  try { const [hour, minute] = time.split(':').map(Number); await reminders.save(user.id, {enabled, hour, minute}); setMessage(enabled ? `Lembrete diario ativado para ${time}.` : 'Lembrete desativado neste aparelho.'); }
  catch (e) { setMessage(e instanceof Error ? e.message : 'Nao foi possivel salvar.'); }
  finally { setBusy(false); }
 }
 return <Screen scroll keyboardAware><ScreenHeader title="Lembretes no celular" subtitle="Um momento para cuidar do seu negocio." /><View style={{gap:20, paddingTop:24}}>
 <Text style={{color:theme.colors.text}}>Receba uma notificacao diaria para revisar clientes, propostas e retornos. O aviso e generico e nao mostra nomes nem valores na tela bloqueada.</Text>
 {!reminders.supported ? <Text style={{color:theme.colors.textSecondary}}>Abra o aplicativo instalado no Android para ativar. O navegador do computador nao recebe este lembrete.</Text> : <>
 <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{color:theme.colors.text}}>Receber lembrete diario</Text><Switch accessibilityLabel="Receber lembrete diario" value={enabled} onValueChange={setEnabled} disabled={!ready || busy} trackColor={{true:theme.colors.primary}} /></View>
 <Input label="Horario local (HH:MM)" value={time} onChangeText={setTime} placeholder="09:00" />
 <Text style={{color:theme.colors.textSecondary}}>Vale para este aparelho, inclusive com o app fechado. O horario e aproximado: economia de bateria e configuracoes do celular podem atrasar o aviso. Ao sair da conta, o lembrete e desligado.</Text>
 <Button label="Salvar lembrete" onPress={() => void save()} loading={busy} disabled={!ready} />
 <Button label="Testar em 5 segundos" variant="outline" disabled={busy || !ready} onPress={async () => { setBusy(true); try { await reminders.test(); setMessage('Teste agendado. Aguarde alguns segundos.'); } catch(e) { setMessage(e instanceof Error ? e.message : 'Falha ao testar.'); } finally { setBusy(false); } }} />
 <Button label="Abrir permissoes do celular" variant="ghost" onPress={() => void Linking.openSettings().catch(() => setMessage('Abra as configuracoes do celular manualmente.'))} />
 </>}
 {message ? <Text accessibilityLiveRegion="polite" style={{color:theme.colors.text}}>{message}</Text> : null}
 </View></Screen>;
}
