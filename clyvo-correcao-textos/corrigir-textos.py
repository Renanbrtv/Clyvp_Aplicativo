from pathlib import Path
import re, shutil
from datetime import datetime

root = Path.cwd()
if (root / 'frontend/app').is_dir():
    root = root / 'frontend'
if not (root / 'app').is_dir() or not (root / 'src').is_dir():
    raise SystemExit('Execute na pasta principal do Clyvo ou na pasta frontend.')

pairs = [
('Perguntar a Cly', 'Perguntar à Cly'),
('Vendas do mes', 'Vendas do mês'),
('Resumo do mes', 'Resumo do mês'),
('Primeiro mes com vendas registradas', 'Primeiro mês com vendas registradas'),
('Negociacoes', 'Negociações'),
('Orcamentos', 'Orçamentos'),
('Precisa da sua atencao', 'Precisa da sua atenção'),
('Politica de Privacidade', 'Política de Privacidade'),
('Politica de privacidade', 'Política de privacidade'),
('O que voce vende?', 'O que você vende?'),
('Assim o Clyvo ja abre com o que importa para o seu dia.', 'Assim, o Clyvo já abre com o que importa para o seu dia.'),
('Assim o Clyvo já abre com o que importa para o seu dia.', 'Assim, o Clyvo já abre com o que importa para o seu dia.'),
('Servicos e produtos', 'Serviços e produtos'),
('Servicos', 'Serviços'),
('Qual e o seu objetivo principal?', 'Qual é o seu objetivo principal?'),
('Isso define o que aparece em destaque no seu inicio.', 'Isso define o que aparece em destaque na sua tela inicial.'),
('Isso define o que aparece em destaque no seu início.', 'Isso define o que aparece em destaque na sua tela inicial.'),
('Criar orcamentos', 'Criar orçamentos'),
('Nao esquecer de responder clientes', 'Não me esquecer de responder aos clientes'),
('Não esquecer de responder clientes', 'Não me esquecer de responder aos clientes'),
('Comecar a usar o Clyvo', 'Começar a usar o Clyvo'),
('Voce nao precisa ter empresa ou CNPJ para começar.', 'Você não precisa ter empresa ou CNPJ para começar.'),
('Voce nao precisa ter empresa ou CNPJ para comecar.', 'Você não precisa ter empresa ou CNPJ para começar.'),
('O que voce quer fazer com o Clyvo?', 'O que você quer fazer com o Clyvo?'),
('Ja tenho clientes', 'Já tenho clientes'),
('Quero oferecer meus servicos', 'Quero oferecer meus serviços'),
('Quero organizar meu negocio', 'Quero organizar meu negócio'),
]
files = {
'app/(tabs)/index.tsx', 'app/(tabs)/perfil.tsx', 'app/onboarding.tsx',
'app/mercado/comecar.tsx',
'src/features/dashboard/components/SalesCard.tsx',
'src/features/dashboard/components/StatsCard.tsx',
'src/features/dashboard/components/ActionCard.tsx',
'src/features/dashboard/components/AttentionCard.tsx',
}
changes = []
for rel in sorted(files):
    p = root / rel
    if not p.is_file():
        print('Não encontrado, preservado:', rel)
        continue
    old = p.read_text(encoding='utf-8')
    new = old
    for a, b in pairs:
        new = new.replace(a, b)
    new = re.sub(r'Quase l[aá](?=[<\'\"])', 'Quase lá!', new)
    if rel == 'app/mercado/comecar.tsx':
        new = re.sub(r'Publica[cç][oõ]es e perfis profissionais vis[ií]veis podem ser vistos por\s+outros usu[aá]rios\.', 'Publicações e perfis profissionais públicos podem ser vistos por outros usuários.', new)
        new = re.sub(r'N[aã]o h[aá] promessa de renda nem pagamento\s+intermediado pelo Clyvo\.', 'Não há promessa de renda nem intermediação de pagamentos pelo Clyvo.', new)
        new = re.sub(r'Voce pode explorar sem aceitar as regras\.', 'Você pode explorar sem aceitar as regras.', new)
        new = re.sub(r'Para publicar, enviar propostas e conversar ser[aá] necess[aá]rio\s+aceit[aá]-las\.', 'Para publicar, enviar propostas e conversar, será necessário aceitá-las.', new)
    if old != new:
        changes.append((p, rel, new))
if changes:
    backup = root.parent / ('backup-textos-' + datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
    for p, rel, new in changes:
        dest = backup / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, dest)
        p.write_text(new, encoding='utf-8')
        print('Corrigido:', rel)
    print('Backup:', backup)
else:
    print('Nenhuma substituição necessária nos textos reconhecidos.')
print('Concluído. Gere novamente a versão web para atualizar a pasta dist.')
