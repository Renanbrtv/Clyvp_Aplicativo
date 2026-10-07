import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '../src/features/auth/auth-context';
import { Screen, ScreenHeader } from '../src/shared/components';
import { useThemeMode } from '../src/shared/theme';
import {
  api,
  Button,
  Card,
  Text,
  View,
  styles,
  Note,
  Field,
  Choices,
  Picture,
  Feedback,
  useAction,
} from '../src/features/marketplace/ui';
const EMAIL = 'skybreakersstudio@gmail.com';
const categories = [
  ['aplicativo', 'Problema no aplicativo'],
  ['login', 'Nao consigo entrar na minha conta'],
  ['cadastro', 'Problema com cadastro'],
  ['propostas', 'Problema com orcamento'],
  ['clientes', 'Problema com cliente'],
  ['oportunidade', 'Problema com oportunidade'],
  ['proposta', 'Problema com proposta'],
  ['assinatura', 'Problema com pagamento/assinatura'],
  ['erro', 'Erro ou travamento'],
  ['sugestao', 'Sugestao de melhoria'],
  ['denuncia', 'Denunciar conteudo/usuario'],
  ['cly', 'Assistente Cly'],
  ['notificacoes', 'Notificacoes'],
  ['outro', 'Outro'],
];
const request = () => ({
  id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
  date: new Date().toISOString(),
});
export default function Support() {
  useThemeMode();
  const params = useLocalSearchParams<{ suggestion?: string }>(),
    suggestion = params.suggestion === '1',
    r = useRouter(),
    { user } = useAuth(),
    a = useAction();
  const [category, C] = useState(suggestion ? 'sugestao' : 'aplicativo'),
    [subject, S] = useState(''),
    [message, M] = useState(''),
    [image, I] = useState<string | null>(null),
    [reference, R] = useState(''),
    [configured, CF] = useState(false),
    [notice, N] = useState('');
  const ref = useRef(request()),
    version = Constants.expoConfig?.version ?? '1.0.0',
    label = categories.find((c) => c[0] === category)?.[1] ?? '',
    valid = subject.trim().length >= 3 && message.trim().length >= 10;
  useEffect(() => {
    let active = true;
    void api
      .get<any>('/support', { auth: false })
      .then((d) => {
        if (active) CF(d.configured);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  function edit() {
    ref.current = request();
    N('');
  }
  async function email() {
    const prefix =
      category === 'sugestao'
        ? 'SUGESTÃO CLYVO'
        : category === 'erro'
          ? 'BUG'
          : ['login', 'cadastro'].includes(category)
            ? 'CONTA'
            : 'SUPORTE';
    await Linking.openURL(
      `mailto:${EMAIL}?subject=${encodeURIComponent(`[${prefix}] ${subject}`)}&body=${encodeURIComponent(`Categoria: ${label}\nData/hora: ${ref.current.date}\nAplicativo: ${version} (${Platform.OS})\nNome: ${user?.name ?? 'Informe seu nome'}\nE-mail da conta: ${user?.email ?? 'Informe o e-mail da conta'}\n\n${message}`)}`,
    );
    N('Revise e toque em Enviar no seu aplicativo de e-mail. Se quiser, anexe a imagem manualmente.');
  }
  return (
    <Screen scroll keyboardAware>
      <ScreenHeader
        title={suggestion ? 'Enviar sugestao' : 'Ajuda e suporte'}
        subtitle={
          suggestion
            ? 'Tem uma ideia para melhorar o Clyvo? Queremos ouvir voce.'
            : 'Precisa de ajuda? Conte o que aconteceu para nossa equipe analisar.'
        }
      />
      <View style={styles.body}>
        {reference ? (
          <Card>
            <Text style={styles.title}>Solicitacao encaminhada para envio</Text>
            <Note>
              O servico de e-mail aceitou a solicitacao para {EMAIL}. A resposta sera enviada ao e-mail da sua
              conta.
            </Note>
            <Text selectable style={styles.label}>
              {reference}
            </Text>
            <Button
              label="Nova solicitacao"
              onPress={() => {
                R('');
                S('');
                M('');
                I(null);
                edit();
              }}
            />
          </Card>
        ) : (
          <>
            {!suggestion ? (
              <Choices
                label="Categoria"
                options={categories.map((c) => c[1])}
                value={label}
                onChange={(v: string) => {
                  C(categories.find((c) => c[1] === v)![0]);
                  edit();
                }}
              />
            ) : (
              <Note>Categoria: Sugestao de melhoria</Note>
            )}
            {category === 'login' ? (
              <Button
                label="Recuperar minha senha"
                variant="ghost"
                onPress={() => r.push('/(auth)/esqueci-senha')}
              />
            ) : null}
            <Field
              label={suggestion ? 'Sugestao' : 'Assunto'}
              value={subject}
              maxLength={120}
              editable={!a.busy}
              onChangeText={(v) => {
                S(v);
                edit();
              }}
            />
            <Field
              label={suggestion ? 'Descricao da sugestao' : 'Descreva o problema'}
              multiline
              maxLength={2000}
              value={message}
              editable={!a.busy}
              onChangeText={(v) => {
                M(v);
                edit();
              }}
            />
            <Picture
              value={image}
              onChange={(v) => {
                I(v);
                edit();
              }}
              label="Anexar imagem (opcional)"
            />
            <Note>
              Destino: {EMAIL}. Serao enviados categoria, assunto, descricao, data/hora, versao do app,
              plataforma e sua identificacao de conta para resposta. Somente a imagem escolhida sera anexada.
              Nao inclua senhas, tokens, documentos ou dados bancarios.
            </Note>
            {user && configured ? (
              <Button
                label="Enviar solicitacao"
                loading={a.busy}
                disabled={!valid}
                onPress={() =>
                  void a.run(async () => {
                    const result = await api.post<{ reference: string }>('/support', {
                      category,
                      subject,
                      message,
                      appVersion: version,
                      platform: Platform.OS,
                      requestId: ref.current.id,
                      createdAt: ref.current.date,
                      ...(image ? { image } : {}),
                    });
                    R(result.reference);
                  }, 'Solicitacao aceita pelo servico de e-mail.')
                }
              />
            ) : (
              <Note>
                {user ? 'O envio direto esta indisponivel.' : 'Sem acesso a conta?'} Use seu aplicativo de
                e-mail abaixo.
              </Note>
            )}
            <Button
              label="Abrir meu e-mail"
              variant="outline"
              disabled={!valid || a.busy}
              onPress={() => void a.run(email, 'Mensagem preparada no aplicativo de e-mail.')}
            />
            {notice ? <Note>{notice}</Note> : null}
            <Feedback action={a} />
          </>
        )}
        {!suggestion ? (
          <Button label="Enviar sugestao" variant="ghost" onPress={() => r.push('/sugestoes')} />
        ) : null}
        <Button label="Privacidade" variant="ghost" onPress={() => r.push('/privacidade')} />
      </View>
    </Screen>
  );
}
