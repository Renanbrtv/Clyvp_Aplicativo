/**
 * Cly Local v2 - assistente profissional determinística.
 * Não faz chamadas a modelos externos, não lê dados privados e não executa ações.
 * Usa as últimas mensagens recebidas do chat para continuar tarefas guiadas.
 */
export type ClyAction = 'mensagem' | 'descricao' | 'proposta';
type Intent = 'mensagem_generica' | 'cobranca' | 'agradecimento' | 'agendamento' | 'proposta' | 'descricao' | 'primeiro_contato' | 'pos_venda' | 'negociacao' | 'cancelamento' | 'lembrete' | 'recusa' | 'ajuda';
type Tone = 'amigavel' | 'formal' | 'curto' | 'profissional';
type Slots = { cliente?: string; servico?: string; valor?: string; data?: string; horario?: string; prazo?: string; tom?: Tone };
type Turn = { who: 'user' | 'cly'; text: string };
const F = (field: string) => `[${field}]`;

function normalized(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function contains(text: string, terms: string[]): boolean {
  return terms.some(term => normalized(text).includes(term));
}
function transcript(input: string): Turn[] {
  try {
    const parsed: unknown = JSON.parse(input);

    if (Array.isArray(parsed)) {
      const turns: Turn[] = parsed.flatMap((item: unknown): Turn[] => {
        if (!item || typeof item !== 'object') return [];

        const msg = item as {
          who?: unknown;
          role?: unknown;
          text?: unknown;
          content?: unknown;
        };

        const who = msg.who ?? msg.role;
        const value = msg.text ?? msg.content;

        if (
          (who !== 'user' && who !== 'cly' && who !== 'assistant') ||
          typeof value !== 'string'
        ) return [];

        return [{
          who: who === 'user' ? 'user' : 'cly',
          text: value.slice(0, 2000)
        }];
      });

      if (turns.length) return turns.slice(-10);
    }
  } catch {
    // Continua com o formato textual.
  }

  const turns: Turn[] = [];
  let turn: Turn | null = null;

  for (const line of input.split(/\r?\n/)) {
    const match = line.match(/^\s*(Usu[aá]rio|User|Cly)\s*:\s*(.*)$/i);

    if (match) {
      if (turn) turns.push(turn);
      turn = {
        who: normalized(match[1]) === 'cly' ? 'cly' : 'user',
        text: match[2]
      };
    } else if (turn) {
      turn.text += `\n${line}`;
    }
  }

  if (turn) turns.push(turn);

  return turns.length
    ? turns.slice(-10)
    : [{ who: 'user', text: input }];
}
function extractSlots(text: string): Slots {
  const slots: Slots = {};
  const client = text.match(/(?:cliente(?:\s+se\s+chama)?|nome\s+do\s+cliente|para\s+(?:a|o)\s+cliente)\s*(?:é|:|chamado|chamada)?\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][\p{L}]{1,24}(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][\p{L}]{1,24})?)/u);
  if (client) slots.cliente = client[1];
  const service = text.match(/(?:servi[cç]o\s+(?:de|é|:)|trabalho\s+(?:de|é|:)|or[cç]amento\s+(?:de|para)|proposta\s+(?:de|para))\s+([^.,;!\n]{3,75})/i);
  if (service) slots.servico = service[1].trim().replace(/\s+(?:por|para|com)\s+(?:r\$|o cliente|a cliente).*$/i, '').slice(0, 65);
  const price = text.match(/(?:R\$\s*\d[\d.,]*|(?:valor|pre[cç]o|custa|cobrar|ficou em)\s*(?:de|é|:)?\s*\d[\d.,]*)/i);
  if (price) {
    const numeric = price[0].match(/\d[\d.,]*/)?.[0];
    if (numeric) slots.valor = `R$ ${numeric}`;
  }
  const date = text.match(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|\b(?:segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)(?:-feira)?\b|\b(?:amanh[aã]|hoje)\b/i);
  if (date) slots.data = date[0];
  const time = text.match(/\b(?:[01]?\d|2[0-3])\s*(?:h|:)\s*[0-5]?\d?\b/i);
  if (time) slots.horario = time[0].replace(/\s+/g, '');
  const deadline = text.match(/(?:prazo|entrega|conclus[aã]o)\s*(?:de|em|:|é)?\s*(\d{1,3}\s*(?:dias?|semanas?|meses?|horas?))/i);
  if (deadline) slots.prazo = deadline[1];
  return slots;
}
function mergeSlots(turns: Turn[]): Slots {
  const combined: Slots = {};
  for (const turn of turns.filter(t => t.who === 'user')) Object.assign(combined, extractSlots(turn.text));
  return combined;
}
function detectTone(text: string): Tone | undefined {
  const n = normalized(text);
  if (/\b(formal|mais serio|seria|educado|respeitoso)\b/.test(n)) return 'formal';
  if (/\b(amigavel|descontraido|leve|carinhoso|simpatico)\b/.test(n)) return 'amigavel';
  if (/\b(curto|curta|resumido|resumida|breve|direto|objetivo|menor)\b/.test(n)) return 'curto';
  if (/\b(profissional|comercial|bem escrito)\b/.test(n)) return 'profissional';
  return undefined;
}
function detectIntent(text: string, action: ClyAction): Intent | undefined {
  const t = normalized(text);
  if (contains(t, ['cobr', 'inadimpl', 'pagamento pendente', 'nao pagou', 'em atraso', 'pagar o servico'])) return 'cobranca';
  if (contains(t, ['agradec', 'obrigad', 'depoimento', 'avaliacao do cliente', 'feedback'])) return 'agradecimento';
  if (contains(t, ['agend', 'remarc', 'horario', 'confirmar visita', 'marcar atendimento'])) return 'agendamento';
  if (contains(t, ['proposta', 'orcament', 'quanto cobrar', 'preco do servico', 'valor do servico'])) return 'proposta';
  if (contains(t, ['descri', 'anuncio', 'divulga', 'publicar servico', 'melhorar texto', 'corrig', 'reescrev', 'ortografia'])) return 'descricao';
  if (contains(t, ['primeiro contato', 'apresentar meu servico', 'oferecer meu servico', 'captar cliente'])) return 'primeiro_contato';
  if (contains(t, ['pos-venda', 'pos venda', 'depois do servico', 'acompanhamento'])) return 'pos_venda';
  if (contains(t, ['negoci', 'desconto', 'parcel', 'contraproposta'])) return 'negociacao';
  if (contains(t, ['cancelar', 'cancelamento', 'nao poderei comparecer'])) return 'cancelamento';
  if (contains(t, ['lembr', 'recordar'])) return 'lembrete';
  if (contains(t, ['recusar', 'dizer nao', 'nao posso atender'])) return 'recusa';
  if (contains(t, ['o que voce faz', 'opcoes', 'menu', 'me ajuda', 'ajuda com o que', 'como funciona'])) return 'ajuda';
  if (action === 'mensagem' &&
      /\b(mensagem para|mandar uma mensagem|escrever uma mensagem|preparar uma mensagem|mensagem para um cliente)\b/.test(t))
    return 'mensagem_generica';
  if (action === 'proposta') return 'proposta';
  if (action === 'descricao') return 'descricao';
  return undefined;
}
function priorIntent(turns: Turn[], action: ClyAction): Intent | undefined {
  for (const turn of [...turns].reverse()) {
    if (turn.who !== 'user') continue;
    const intent = detectIntent(turn.text, action);
    if (intent && intent !== 'ajuda') return intent;
  }
  return undefined;
}
function greeting(text: string): boolean {
  return /^(oi+|ol[aá]+|bom dia|boa tarde|boa noite|e ai|opa|hey)[!?.\s]*$/i.test(text.trim());
}
function styleText(intro: string, body: string, tone: Tone): string {
  if (tone === 'curto') return body;
  if (tone === 'formal') return `${intro.replace('Olá!', 'Prezado(a),')}\n\n${body}\n\nAtenciosamente.`;
  if (tone === 'amigavel') return `${intro}\n\n${body}\n\nObrigado pela atenção! 😊`;
  return `${intro}\n\n${body}\n\nFico à disposição.`;
}
function build(intent: Intent, slots: Slots, tone: Tone): string {
  const name = slots.cliente || F('nome do cliente');
  const job = slots.servico || F('serviço');
  const price = slots.valor || `R$ ${F('valor')}`;
  const date = slots.data || F('data');
  const time = slots.horario || F('horário');
  const deadline = slots.prazo || F('prazo');
  const hi = `Olá, ${name}! Tudo bem?`;
  if (intent === 'cobranca') return styleText(hi, `Gostaria de verificar o pagamento referente a ${job}${slots.valor ? `, no valor de ${slots.valor}` : ''}. Você poderia me informar uma previsão de pagamento?`, tone);
  if (intent === 'agradecimento') return styleText(hi, `Obrigado por confiar no meu trabalho${slots.servico ? ` de ${job}` : ''}. Foi um prazer atender você! Se puder deixar uma avaliação, ela será muito bem-vinda.`, tone);
  if (intent === 'agendamento') return styleText(hi, `Gostaria de confirmar nosso atendimento de ${job} em ${date}, às ${time}. Está tudo certo para você?`, tone);
  if (intent === 'primeiro_contato') return styleText(hi, `Trabalho com ${job} e gostaria de saber mais sobre o que você precisa. Posso apresentar uma proposta adequada à sua necessidade?`, tone);
  if (intent === 'pos_venda') return styleText(hi, `Passando para saber se ficou tudo certo com ${job}. Se tiver qualquer dúvida sobre o serviço realizado, pode me chamar.`, tone);
  if (intent === 'negociacao') return styleText(hi, `Podemos conversar sobre as condições do serviço de ${job}. Minha proposta atual é de ${price}. Se quiser, podemos avaliar alternativas de escopo e pagamento antes de fechar.`, tone);
  if (intent === 'cancelamento') return styleText(hi, `Preciso reagendar o atendimento de ${job} previsto para ${date}. Peço desculpas pelo transtorno. Podemos combinar uma nova data?`, tone);
  if (intent === 'lembrete') return styleText(hi, `Passando para lembrar do nosso compromisso de ${job} em ${date}, às ${time}. Pode confirmar o recebimento?`, tone);
  if (intent === 'recusa') return styleText(hi, `Agradeço pelo contato! No momento, não conseguirei realizar ${job} nas condições solicitadas. Prefiro avisar com antecedência para você poder se organizar.`, tone);
  if (intent === 'proposta') return `**Rascunho de proposta comercial**\n\nCliente: ${name}\nServiço: ${job}\nEscopo: ${F('detalhes do que será realizado')}\nValor: ${price}\nPrazo: ${deadline}\nPagamento: ${F('condições combinadas')}\n\n${styleText(hi, `Segue minha proposta para ${job}. Podemos alinhar os detalhes antes da confirmação.`, tone)}\n\n*Revise valores, escopo e condições antes de enviar.*`;
  if (intent === 'descricao') return `**Descrição profissional sugerida**\n\n${job === F('serviço') ? 'Ofereço [nome do serviço]' : `Serviço de ${job}`} com atendimento organizado, comunicação clara e foco nas necessidades do cliente. Entre em contato para explicar o que você precisa e solicitar uma proposta.\n\n*Acrescente apenas diferenciais que você realmente oferece.*`;
  return 'Posso ajudar com mensagens, propostas, descrições, cobranças e agendamentos.';
}
function missingQuestion(intent: Intent, slots: Slots): string | null {
  if (!slots.servico && ['proposta','descricao','primeiro_contato'].includes(intent)) return 'Qual é o serviço que você oferece ou vai realizar?';
  if (intent === 'agendamento' && !slots.data) return 'Qual é a data do atendimento?';
  if (intent === 'agendamento' && !slots.horario) return 'Qual é o horário?';
  return null;
}
function enrichFromDialogue(turns: Turn[], slots: Slots): Slots {
  const filled: Slots = { ...slots };
  for (let i = 1; i < turns.length; i++) {
    if (turns[i].who !== 'user' || turns[i - 1].who !== 'cly') continue;
    const question = normalized(turns[i - 1].text);
    const answer = turns[i].text.trim();
    if (/qual (?:e|seria) (?:o )?servico/.test(question) && !filled.servico) {
      filled.servico = shortServiceAnswer(answer);
    }
    if (/qual (?:e|seria) (?:a )?data/.test(question) && !filled.data) {
      const date = extractSlots(answer).data;
      if (date) filled.data = date;
    }
    if (/qual (?:e|seria) (?:o )?horario/.test(question) && !filled.horario) {
      filled.horario = extractSlots(answer).horario || (/^(?:[01]?\d|2[0-3])$/.test(answer) ? `${answer}h` : undefined);
    }
  }
  return filled;
}
function shortServiceAnswer(text: string): string | undefined {
  if (text.length > 3 && text.length < 75 && !/[?!]/.test(text) && !/^(sim|nao|ok|obrigad|formal|amigavel|curto|profissional)$/i.test(normalized(text))) {
    return text.replace(/^(?:e|é|de|um|uma)\s+/i, '').trim();
  }
  return undefined;
}

export function generateClyLocal(action: ClyAction, context: string): string {
  const turns = transcript(context);
  const current = [...turns].reverse().find(t => t.who === 'user')?.text?.trim().slice(0, 1200) || '';
  if (!current) return 'Olá! Sou a Cly 🧡 O que você precisa preparar hoje?';
  const t = normalized(current);
  if (greeting(current)) return 'Olá! 🧡 Sou a Cly, sua assistente de trabalho. Posso ajudar com clientes, propostas, descrições, cobrança e agendamentos. O que vamos preparar?';
  if (contains(t, ['senha', 'chave de api', 'cartao de credito', 'numero de cartao']) && contains(t, ['me passe', 'me diga', 'qual e a sua'])) return 'Não tenho acesso a senhas, cartões ou credenciais. Posso ajudar com uma tarefa profissional sem esses dados.';
  const previous = turns.slice(0, -1);
  const mostRecentCly = [...previous].reverse().find(x => x.who === 'cly')?.text || '';
  const explicit = detectIntent(current, action);
  const intent = explicit && explicit !== 'ajuda' ? explicit : priorIntent(previous, action);
  if (explicit === 'ajuda' && !intent) return 'Posso criar mensagens para clientes, cobranças educadas, propostas, descrições de serviços, confirmações de horário e mensagens de pós-venda. Diga o que precisa e eu faço perguntas para personalizar.';
  if (!intent) return 'Posso ajudar! Você quer preparar uma mensagem, proposta, descrição de serviço, cobrança ou agendamento? Assim consigo montar um texto útil para você.';

  const assunto = [...turns].reverse()
    .filter(turn => turn.who === 'user')
    .map(turn => turn.text.match(/^\s*(?:é|e)\s+sobre\s+([^.!?\n]{3,80})/i)?.[1]?.trim())
    .find((value): value is string => Boolean(value));

  if (intent === 'mensagem_generica') {
    if (!assunto)
      return 'Claro! Qual é o assunto da mensagem que você quer enviar ao cliente?';

    return `Entendi! Sobre ${assunto}, você quer apresentar seu serviço, enviar um orçamento, combinar um agendamento ou tratar de outro assunto?`;
  }

  const slots = enrichFromDialogue(turns, mergeSlots(turns));
  if (assunto && !slots.servico) slots.servico = assunto;
  const previousUser = previous.filter(x => x.who === 'user');
  const prevTone = previousUser.map(x => detectTone(x.text)).filter((x): x is Tone => Boolean(x)).at(-1);
  const tone = detectTone(current) || prevTone || 'profissional';
  if (!slots.servico && /qual (?:é|e) (?:o )?servi[cç]o/i.test(mostRecentCly)) {
    slots.servico = shortServiceAnswer(current);
  }
  if (intent === 'agendamento' && !slots.horario && /qual (?:é|e) (?:o )?hor[aá]rio/i.test(mostRecentCly)) {
    const hh = current.match(/\b(?:[01]?\d|2[0-3])\b/);
    if (hh) slots.horario = `${hh[0]}h`;
  }
  if (intent === 'agendamento' && !slots.data && /qual (?:é|e) (?:a )?data/i.test(mostRecentCly)) {
    slots.data = shortServiceAnswer(current);
  }
  // Se o usuário fizer uma pergunta livre, não fingir que a assistente entendeu tudo.
  if (/\?$/.test(current) && !explicit && !/\b(?:pode|consegue)\s+(?:fazer|deixar|montar|escrever)/i.test(t)) {
    return 'Consigo orientar sobre mensagens, propostas e atendimento profissional, mas não tenho acesso a pesquisas na internet nem respostas para todos os assuntos. Quer que eu monte um texto relacionado ao seu trabalho?';
  }
  const question = missingQuestion(intent, slots);
  if (question && (!mostRecentCly || !contains(t, ['sem informar', 'deixe em branco', 'modelo generico']))) return `Claro! ${question}`;
  const result = build(intent, slots, tone);
  const changedTone = Boolean(detectTone(current)) && !explicit;
  const followup = intent === 'proposta' ? 'Quer preencher o valor, o prazo ou os detalhes do serviço?' : intent === 'descricao' ? 'Quer deixar a descrição mais curta, formal ou comercial?' : 'Quer que eu deixe a mensagem mais curta, formal ou amigável?';
  return `${changedTone ? 'Claro! Ajustei o tom da mensagem:\n\n' : 'Preparei uma sugestão para você revisar:\n\n'}${result}\n\n${followup}`;
}
