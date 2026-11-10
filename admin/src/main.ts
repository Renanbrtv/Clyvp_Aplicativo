import {api,ApiError,setCsrf,type Identity,type Page,type RecordRow} from './api.js';
import {el,button,input,select,field,display,date,money,labels,badge,icon,message,dialog} from './ui.js';
const root=document.querySelector<HTMLDivElement>('#app')!;
let identity:Identity;
let section='dashboard',page=1,search='',status='',generation=0;
let content:HTMLElement;
type Column=[string,string,((v:unknown)=>string)?];
const config:Record<string,{title:string;desc:string;permission:string;columns:Column[];states:string[]}>={
 users:{title:'Usuários',desc:'Contas e acesso à plataforma.',permission:'users.read',columns:[['name','Nome'],['email','E-mail'],['plan','Plano'],['created_at','Cadastro',date],['last_login_at','Último acesso',date],['status','Situação']],states:['ativo','bloqueado','inativo']},
 posts:{title:'Oportunidades',desc:'Analise publicações antes que sejam exibidas no marketplace.',permission:'content.read',columns:[['title','Publicação'],['owner','Anunciante'],['category','Categoria'],['budget_from','Valor inicial',money],['created_at','Publicada em',date],['status','Análise']],states:['pending','approved','changes','rejected','suspended']},
 profiles:{title:'Profissionais',desc:'Perfis, áreas de atuação e avaliações recebidas.',permission:'content.read',columns:[['name','Profissional'],['city','Cidade'],['skills','Áreas de atuação'],['rating','Avaliação'],['status','Análise']],states:['pending','approved','changes','rejected','suspended']},
 reports:{title:'Denúncias',desc:'Examine o conteúdo e registre uma decisão fundamentada.',permission:'reports',columns:[['id','Nº'],['target_type','Conteúdo'],['reason','Motivo'],['reporter','Denunciante'],['created_at','Recebida em',date],['status','Situação']],states:['aberta','resolvida']},
 proposals:{title:'Propostas',desc:'Propostas enviadas no marketplace Clyvo.',permission:'proposals',columns:[['title','Oportunidade'],['professional','Profissional'],['amount','Valor',money],['due_date','Prazo',date],['status','Situação']],states:['enviada','aceita','recusada','retirada']},
 subscriptions:{title:'Assinaturas',desc:'Última assinatura registrada de cada conta. A cobrança é gerenciada pela loja.',permission:'billing',columns:[['name','Usuário'],['plan','Plano'],['effective_status','Situação'],['current_period_end','Fim do período',date],['external_provider','Origem'],['price_paid','Valor registrado',money]],states:['ativa','expirada','cancelada','inadimplente','trialing']},
 admins:{title:'Administradores',desc:'Autorize contas existentes e defina o acesso de cada pessoa.',permission:'settings',columns:[['name','Nome'],['email','E-mail'],['role','Permissão'],['status','Situação'],['created_at','Autorizado em',date]],states:['ativo','inativo']},
 audit:{title:'Histórico de ações',desc:'Registro de decisões, autorizações e alterações administrativas.',permission:'audit',columns:[['created_at','Data',date],['actor','Responsável'],['action','Ação'],['target_type','Tipo'],['target_id','Registro'],['reason','Justificativa']],states:[]},
};
const can=(p:string)=>identity.permissions.includes(p);
async function boot(){try{identity=await api<Identity>('/me');setCsrf(identity.csrf);shell();}catch(e){login(e instanceof ApiError&&e.status===401?undefined:(e as Error).message);}}
function login(error?:string){
 root.replaceChildren();const wrap=el('main','login');const card=el('section','login-card');
 const logo=el('div','logo-window');const img=el('img');img.src='./logo.png';img.alt='Clyvo Admin';logo.append(img);
 card.append(logo,el('span','eyebrow','ACESSO ADMINISTRATIVO'),el('h1','','Tudo sob controle.'),el('p','muted','Entre com sua conta autorizada para gerenciar o Clyvo.'));
 const form=el('form');const email=input('E-mail','email','voce@empresa.com');email.control.autocomplete='username';email.control.required=true;
 const password=input('Senha','password','Sua senha do Clyvo');password.control.autocomplete='current-password';password.control.required=true;
 const alert=el('div');if(error)alert.append(message(error));const submit=el('button','button primary','Entrar no painel');submit.type='submit';
 form.append(email.wrap,password.wrap,alert,submit);form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;alert.replaceChildren();try{await api('/login',{email:email.control.value,password:password.control.value});password.control.value='';await boot();}catch(err){alert.append(message((err as Error).message));}finally{submit.disabled=false;}};
 card.append(form,el('p','secure-note','Acesso restrito · Sessão protegida · Ações registradas'));
 wrap.append(card);root.append(wrap);
}
function shell(){
 root.replaceChildren();const header=el('header','topbar');const menu=button('',()=>document.body.classList.toggle('nav-open'),'icon-button');menu.append(icon('menu'));menu.setAttribute('aria-label','Abrir navegação');
 const brand=el('a','brand');brand.href='#dashboard';brand.append(el('span','wordmark','Clyvo'),el('span','brand-divider'),el('span','admin-word','Admin'));
 const global=el('form','global-search');global.append(icon('search'));const g=el('input');g.placeholder='Pesquisar usuários, publicações e profissionais';g.setAttribute('aria-label','Pesquisa global');global.append(g);global.onsubmit=e=>{e.preventDefault();globalSearch(g.value);};
 const person=el('div','person');person.append(el('span','avatar',identity.name.slice(0,2).toUpperCase()));const details=el('div','person-text');details.append(el('strong','',identity.name),el('span','muted',labels[identity.role]??identity.role));person.append(details,button('Sair',async()=>{try{await api('/logout',{});setCsrf('');login();}catch(e){content.prepend(message((e as Error).message));}},'button ghost'));
 header.append(menu,brand,global,person);
 const aside=el('aside','sidebar');aside.append(el('p','nav-caption','WORKSPACE CLYVO'));const nav=el('nav');nav.setAttribute('aria-label','Administração');
 const items=[['dashboard','Visão geral'],...Object.entries(config).filter(([,v])=>can(v.permission)).map(([k,v])=>[k,v.title])];
 for(const [key,label]of items){if(key==='admins')nav.append(el('p','nav-caption','ADMINISTRAÇÃO'));const link=el('a','nav-link');link.href='#'+key;link.dataset.section=key;link.append(icon(key),el('span','',label));nav.append(link);}
 aside.append(nav);const foot=el('div','sidebar-foot');foot.append(icon('admins'),el('span','','Ambiente administrativo'));aside.append(foot);
 content=el('main','main');content.id='main-content';root.append(header,aside,content);
 window.onhashchange=()=>{const next=location.hash.slice(1)||'dashboard';if(next==='dashboard'||config[next]&&can(config[next].permission)){section=next;page=1;search='';status='';document.body.classList.remove('nav-open');void render();}};
 section=location.hash.slice(1)||'dashboard';if(section!=='dashboard'&&(!config[section]||!can(config[section].permission)))section='dashboard';void render();
}
function title(name:string,desc:string){const h=el('div','page-heading');const copy=el('div');copy.append(el('div','breadcrumb','Clyvo Admin / '+name),el('h1','',name),el('p','muted',desc));h.append(copy,button('Atualizar',()=>void render(),'button secondary'));return h;}
function failure(target:HTMLElement,e:unknown){if(e instanceof ApiError&&e.status===401){setCsrf('');login('Sua sessão expirou. Entre novamente.');return;}target.replaceChildren(message((e as Error).message),button('Tentar novamente',()=>void render(),'button secondary'));}
async function render(){
 const run=++generation;document.querySelectorAll<HTMLAnchorElement>('.nav-link').forEach(a=>{const active=a.dataset.section===section;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 content.replaceChildren();if(section==='dashboard'){await dashboard(run);return;}
 const cfg=config[section];content.append(title(cfg.title,cfg.desc));const toolbar=el('form','toolbar');
 const s=input('Buscar','search','Nome, e-mail ou título');s.control.value=search;s.control.maxLength=100;
 const st=select('Situação',[['','Todas'],...cfg.states.map(v=>[v,labels[v]??v] as [string,string])]);st.control.value=status;
 const submit=el('button','button secondary','Filtrar');submit.type='submit';toolbar.append(s.wrap);if(cfg.states.length)toolbar.append(st.wrap);toolbar.append(submit);toolbar.onsubmit=e=>{e.preventDefault();search=s.control.value;status=st.control.value;page=1;void render();};
 if(section==='admins')toolbar.append(button('Autorizar administrador',()=>memberForm(),'button primary'));
 content.append(toolbar);const panel=el('section','panel');panel.append(message('Carregando registros…','loading'));content.append(panel);
 try{const result=await api<Page>('/'+section+'?'+new URLSearchParams({search,status,page:String(page)}));if(run!==generation)return;panel.replaceChildren();table(panel,section,result);
 if(section==='admins'){const box=el('section','info-panel');box.append(el('h2','','Permissões e proteção'),el('p','muted','Proprietário: gestão completa. Moderador: conteúdo e denúncias. Suporte: consultas de usuários e conteúdo. Financeiro: assinaturas. Auditor: consultas e histórico.'));
 const settings=await api<{sessionHours:number;idleMinutes:number;approvalRequired:boolean}>('/settings');if(run!==generation)return;box.append(el('p','muted',`Sessão: ${settings.sessionHours} horas; expiração após ${settings.idleMinutes} minutos sem atividade. Aprovação prévia ${settings.approvalRequired?'obrigatória':'desativada'}.`));content.append(box);}
 }catch(e){if(run===generation)failure(panel,e);}
}
function table(target:HTMLElement,module:string,result:Page,compact=false){
 const cfg=config[module];const head=el('div','panel-heading');head.append(el('h2','',compact?cfg.title:'Registros'),el('span','count',result.total.toLocaleString('pt-BR')));target.append(head);
 if(!result.rows.length){const empty=el('div','empty');empty.append(icon(module),el('h3','','Nenhum registro encontrado'),el('p','muted','Os dados aparecerão aqui quando estiverem disponíveis. Confira também os filtros.'));target.append(empty);return;}
 const scroll=el('div','table-scroll');const table=el('table');const thead=el('thead');const tr=el('tr');for(const [,label]of cfg.columns)tr.append(el('th','',label));
 const actionable=['users','posts','profiles','reports','proposals','admins'].includes(module);if(actionable)tr.append(el('th','action-column','Ação'));thead.append(tr);const tbody=el('tbody');
 for(const row of result.rows){const tr=el('tr');for(const [key,,formatter]of cfg.columns){const td=el('td');if(key==='status'||key==='effective_status')td.append(badge(row[key]));else{let val=row[key];if(key==='skills'&&typeof val==='string'){try{val=JSON.parse(val)}catch{ /* Display original text safely. */ }}td.textContent=formatter?formatter(val):labels[String(val)]??display(val);}tr.append(td);}
 if(actionable){const td=el('td');td.append(button(module==='admins'?'Gerenciar':'Ver detalhes',()=>module==='admins'?memberForm(row):void detail(module,row),'button row-button'));tr.append(td);}tbody.append(tr);}
 table.append(thead,tbody);scroll.append(table);target.append(scroll);
 const foot=el('div','table-footer');foot.append(el('span','muted',`${(result.page-1)*result.pageSize+1}–${Math.min(result.page*result.pageSize,result.total)} de ${result.total} registros`));
 if(!compact){const controls=el('div','pagination');const prev=button('Anterior',()=>{page--;void render();},'button ghost');prev.disabled=page<=1;const next=button('Próxima',()=>{page++;void render();},'button ghost');next.disabled=page*result.pageSize>=result.total;controls.append(prev,el('span','',String(page)),next);foot.append(controls);}else foot.append(button('Ver todos',()=>{location.hash=module;},'button ghost'));target.append(foot);
}
async function dashboard(run:number){
 content.append(title('Visão geral','Acompanhe a plataforma e priorize o que precisa de atenção.'));const area=el('div');area.append(message('Consultando a plataforma…','loading'));content.append(area);
 try{const data=await api<{counts:Record<string,number>;growth:{month:string;total:number}[];asOf:string}>('/dashboard');if(run!==generation)return;area.replaceChildren();
 const cards=el('div','stats-grid');const metrics=[['users','Usuários cadastrados','users'],['professionals','Profissionais','profiles'],['opportunities','Oportunidades','posts'],['pending','Aguardando análise','posts'],['proposals','Propostas enviadas','proposals'],['reports','Denúncias pendentes','reports']];
 for(const [key,label,module]of metrics){const card=el('article','stat-card '+(['pending','reports'].includes(key)?'attention':''));const top=el('div','stat-top');top.append(el('span','muted',label),icon(module));card.append(top,el('strong','stat-value',Number(data.counts[key]??0).toLocaleString('pt-BR')));cards.append(card);}area.append(cards);
 const lower=el('div','dashboard-grid');const graph=el('section','panel growth');const gh=el('div','panel-heading');gh.append(el('h2','','Crescimento da plataforma'),el('span','muted','Últimos 12 meses'));graph.append(gh,el('p','graph-subtitle','Novos usuários por mês'));
 const chart=el('div','chart');const months=[];const now=new Date(data.asOf);for(let i=11;i>=0;i--){const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-i,1));const key=d.toISOString().slice(0,7);months.push({key,label:d.toLocaleDateString('pt-BR',{month:'short',timeZone:'UTC'}),total:Number(data.growth.find(g=>g.month===key)?.total??0)});}const max=Math.max(1,...months.map(m=>m.total));
 for(const m of months){const col=el('div','chart-column');const value=el('span','chart-value',String(m.total));const bar=el('div','chart-bar');bar.style.height=(m.total/max*140)+'px';bar.title=`${m.key}: ${m.total} usuários`;col.append(value,bar,el('span','chart-label',m.label));chart.append(col);}graph.append(chart);lower.append(graph);
 const todo=el('section','panel priority');todo.append(el('span','eyebrow','FILA DE TRABALHO'),el('h2','','Próximas decisões'),el('p','muted','Cada análise ajuda a manter a comunidade segura.'));
 for(const [label,key,module] of [['Publicações em análise','pending','posts'],['Denúncias para revisar','reports','reports']]){if(can(config[module].permission))todo.append(button(`${label} · ${data.counts[key]}`,()=>{location.hash=module;},'task-link'));}
 todo.append(el('p','secure-note','Somente conteúdo aprovado aparece publicamente.'));lower.append(todo);area.append(lower,el('p','updated','Atualizado em '+date(data.asOf)));
 if(can('content.read')){const latest=await api<Page>('/posts?status=pending');if(run!==generation)return;const panel=el('section','panel');table(panel,'posts',latest,true);area.append(panel);}
 }catch(e){if(run===generation)failure(area,e);}
}
async function globalSearch(term:string){if(!term.trim())return;const run=++generation;content.replaceChildren(title('Resultados da pesquisa',`Busca por “${term.slice(0,100)}”`));const area=el('div');content.append(area);area.append(message('Pesquisando…','loading'));try{const result=await api<Record<string,Page>>('/search?'+new URLSearchParams({search:term.slice(0,100)}));if(run!==generation)return;area.replaceChildren();for(const [module,data]of Object.entries(result)){const panel=el('section','panel');table(panel,module,data,true);area.append(panel);}}catch(e){if(run===generation)failure(area,e);}}
function showFields(target:HTMLElement,record:Record<string,unknown>,keys:[string,string][]) {const dl=el('dl','details');for(const [key,label]of keys)dl.append(field(label,record[key]));target.append(dl);}
function photos(target:HTMLElement,value:unknown){let list=value;if(typeof list==='string'){try{list=JSON.parse(list)}catch{return;}}if(!Array.isArray(list))list=list?[list]:[];const gallery=el('div','gallery');for(const url of list as unknown[]){if(typeof url!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(url))continue;const img=el('img');img.src=url;img.alt='Imagem enviada para análise';img.loading='lazy';gallery.append(img);}target.append(gallery);}
async function detail(module:string,row:RecordRow){
 const d=dialog(config[module].title+' · #'+row.id);const body=el('div','drawer-body');body.append(message('Carregando detalhes…','loading'));d.append(body);
 try{
  if(module==='posts'||module==='profiles'){
   const type=module==='posts'?'post':'profile';const result=await api<{content:Record<string,unknown>|null;review:{state:string;revision:number;note:string}|null;owner:{id:number;name:string}|null}>(`/content/${type}/${row.id}`);body.replaceChildren();if(!result.content){body.append(message('Conteúdo não encontrado.'));return;}const c=result.content;
   body.append(el('h3','',display(c.title??c.name)),badge(result.review?.state));if(result.owner)body.append(field('Responsável',result.owner.name));
   showFields(body,c,module==='posts'?[['description','Descrição'],['category','Categoria'],['city','Cidade'],['budget_from','Valor inicial'],['budget_to','Valor final'],['owner_id','ID do anunciante']]:[['services','Serviços'],['skills','Áreas de atuação'],['experience','Experiência'],['bio','Apresentação'],['city','Cidade']]);photos(body,c.photos??(c.photo?[c.photo]:[]));
   if(module==='profiles'){const reviews=await api<RecordRow[]>(`/profiles/${row.id}/reviews`);body.append(el('h3','','Avaliações'));if(!reviews.length)body.append(el('p','muted','Nenhuma avaliação registrada.'));for(const r of reviews){const card=el('div','review');card.append(el('strong','',`${r.stars}/5 · ${r.author}`),el('p','',display(r.comment)));body.append(card);}}
   if(result.review?.note)body.append(message('Última decisão: '+result.review.note,'info'));
   if(can('content.write')&&result.review){const review=result.review;decisionForm(body,[['approved','Aprovar publicação'],['changes','Solicitar correções'],['rejected','Reprovar publicação'],['suspended','Suspender publicação']],async(action,note)=>{await api(`/content/${type}/${row.id}/decision`,{revision:review.revision,action,note});d.close();await render();});}
  }else if(module==='reports'){
   const result=await api<{report:Record<string,unknown>;content:Record<string,unknown>|null;reportedUser:{id:number;name:string}|null}>(`/reports/${row.id}`);body.replaceChildren();showFields(body,result.report,[['reason','Motivo da denúncia'],['target_type','Tipo'],['target_id','ID do conteúdo'],['status','Situação'],['resolution','Decisão anterior']]);
   if(result.reportedUser)body.append(field('Usuário denunciado',result.reportedUser.name));
   if(result.content){showFields(body,result.content,[['owner_id','ID do anunciante'],['sender_id','ID do remetente'],['author_id','ID do autor'],['user_id','ID do perfil'],['title','Título'],['name','Nome'],['description','Descrição'],['message','Mensagem'],['comment','Avaliação'],['bio','Apresentação']].filter(([k])=>k in result.content!) as [string,string][]);photos(body,result.content.photos??(result.content.photo?[result.content.photo]:[]));}else body.append(message('O conteúdo denunciado não está mais disponível.','info'));
   if(result.report.status==='aberta')decisionForm(body,[['ocultar','Ocultar conteúdo / suspender perfil denunciado'],['arquivar','Encerrar sem remoção']],async(action,note)=>{await api(`/reports/${row.id}/resolve`,{action,note});d.close();await render();});
  }else if(module==='users'){
   const result=await api<{user:Record<string,unknown>;company:Record<string,unknown>|null}>(`/users/${row.id}`);body.replaceChildren();showFields(body,result.user,[['name','Nome'],['email','E-mail'],['status','Situação'],['last_login_at','Último acesso']]);if(result.company)showFields(body,result.company,[['trade_name','Empresa'],['city','Cidade'],['state','Estado']]);
   if(can('users.write')&&identity.id!==row.id)decisionForm(body,result.user.status==='bloqueado'?[['ativo','Reativar conta']]:[['bloqueado','Suspender conta']],async(action,note)=>{await api(`/users/${row.id}/status`,{status:action,reason:note});d.close();await render();});
  }else if(module==='proposals'){
   const result=await api<Record<string,unknown>>(`/proposals/${row.id}`);body.replaceChildren();showFields(body,result,[['title','Oportunidade'],['professional','Profissional'],['message','Proposta'],['experience','Experiência'],['amount','Valor'],['due_date','Prazo'],['status','Situação']]);
  }
 }catch(e){body.replaceChildren(message((e as Error).message));}
}
function decisionForm(target:HTMLElement,options:[string,string][],submit:(action:string,note:string)=>Promise<void>){
 const form=el('form','decision-form');form.append(el('h3','','Registrar decisão'));const action=select('Ação administrativa',options);const label=el('label','field');label.append(el('span','','Justificativa'));const note=el('textarea');note.required=true;note.minLength=5;note.maxLength=450;note.rows=4;note.placeholder='Descreva o motivo da decisão (mínimo de 5 caracteres).';label.append(note);
 const confirmation=el('label','confirmation');const check=el('input');check.type='checkbox';check.required=true;confirmation.append(check,document.createTextNode('Revisei o conteúdo e confirmo esta ação.'));const error=el('div');const b=el('button','button primary','Confirmar decisão');b.type='submit';form.append(action.wrap,label,confirmation,error,b);form.onsubmit=async e=>{e.preventDefault();b.disabled=true;error.replaceChildren();try{await submit(action.control.value,note.value.trim());}catch(err){error.append(message((err as Error).message));}finally{b.disabled=false;}};target.append(form);
}
function memberForm(row?:RecordRow){const d=dialog(row?'Gerenciar administrador':'Autorizar administrador');const body=el('div','drawer-body');d.append(body);const form=el('form');const email=input('E-mail da conta existente','email');email.control.required=true;if(row){email.control.value=String(row.email);email.control.readOnly=true;}
 const role=select('Permissão',['owner','moderator','support','finance','auditor'].map(r=>[r,labels[r]]));role.control.value=String(row?.role??'support');const state=select('Acesso',[['true','Autorizado'],['false','Revogado']]);state.control.value=row?.status==='inativo'?'false':'true';const reason=input('Justificativa','text','Por que este acesso será alterado?');reason.control.required=true;reason.control.minLength=5;reason.control.maxLength=450;const err=el('div');const b=el('button','button primary','Salvar acesso');b.type='submit';form.append(email.wrap,role.wrap,state.wrap,reason.wrap,el('p','muted','As sessões administrativas anteriores desta pessoa serão encerradas.'),err,b);form.onsubmit=async e=>{e.preventDefault();b.disabled=true;try{await api('/admins',{email:email.control.value,role:role.control.value,enabled:state.control.value==='true',reason:reason.control.value});d.close();await render();}catch(e){err.replaceChildren(message((e as Error).message));}finally{b.disabled=false;}};body.append(form);}
void boot();
