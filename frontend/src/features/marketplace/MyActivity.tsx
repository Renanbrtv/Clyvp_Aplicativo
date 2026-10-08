import { useRouter } from 'expo-router';
import { Button,Card,Text,Note,styles,useData,currency,prettyDay } from './ui';
import { PostCard } from './PostCard';
export function MyActivity({tab}:{tab:'posts'|'proposals'|'works'}) {
 const d=useData('/market/mine'),router=useRouter();
 if(d.loading)return <Note>Carregando sua atividade...</Note>;
 if(d.error)return <><Note error>{d.error}</Note><Button label="Tentar novamente" onPress={()=>void d.load()}/></>;
 const items=d.data?.[tab]??[];
 return <>
   <Note>{tab==='posts'?'Seus anúncios, incluindo os que aguardam análise. As visualizações contam pessoas diferentes que abriram os detalhes; suas próprias visitas não contam.':tab==='proposals'?'Respostas que você enviou aos anúncios de outras pessoas.':'Serviços combinados após uma proposta ser aceita.'}</Note>
   <Button label="Atualizar" variant="ghost" onPress={()=>void d.load()}/>
   {!items.length?<Card><Text style={styles.title}>{tab==='posts'?'Você ainda não publicou':tab==='proposals'?'Você ainda não enviou propostas':'Nenhum trabalho combinado ainda'}</Text><Button label={tab==='posts'?'Publicar oportunidade':'Explorar oportunidades'} onPress={()=>router.push(tab==='posts'?'/mercado/publicar':'/mercado')}/></Card>:null}
   {items.map((p:any)=>tab==='posts'?<PostCard key={p.id} post={p} own/>:<Card key={p.id}>
     <Text style={styles.title}>{p.title}</Text>
     <Note>{({enviada:'Enviada',aceita:'Aceita',recusada:'Recusada',retirada:'Retirada',andamento:'Em andamento',concluido:'Concluído',cancelado:'Cancelado'} as Record<string,string>)[p.status]??p.status} · {prettyDay(p.due_date)}</Note>
     <Note>{currency(p.amount)}</Note>
     {p.message?<Note>{p.message}</Note>:null}
     {tab==='works'||p.post_visible?<Button label={tab==='works'?'Abrir trabalho':'Ver oportunidade'} variant="outline" onPress={()=>router.push((tab==='works'?'/mercado/trabalho?id='+p.id:'/mercado/oportunidade?id='+p.post_id) as any)}/>:<Note>O anúncio está indisponível. Se sua proposta foi aceita, consulte Meus trabalhos.</Note>}
   </Card>)}
   {items.length>=100?<Note>Mostrando as 100 atividades mais recentes.</Note>:null}
 </>;
}
