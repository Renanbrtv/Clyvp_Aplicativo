import { useState } from 'react';
import { useRouter } from 'expo-router';
import { MarketScreen,Button,Card,Note,Field,Choices,View,useData,CATEGORIES,amount } from '../../src/features/marketplace/ui';
import { MyActivity } from '../../src/features/marketplace/MyActivity';
import { PostCard } from '../../src/features/marketplace/PostCard';
export default function Mercado(){
 const router=useRouter();
 const [tab,setTab]=useState('Explorar'),[search,S]=useState(''),[filters,F]=useState(false),[category,C]=useState('Todas'),[city,City]=useState(''),[mode,M]=useState('Todos'),[min,Min]=useState(''),[max,Max]=useState(''),[query,Q]=useState(''),[page,P]=useState(1),[filterError,E]=useState('');
 const d=useData('/market/posts?'+query+'&page='+page);
 const me=useData('/market/me');
 function apply(){
  E('');
  const a=amount(min),b=amount(max);
  if((a!==null&&(!Number.isFinite(a)||a<0))||(b!==null&&(!Number.isFinite(b)||b<0))||(a!==null&&b!==null&&b<a)){E('Confira os valores: o máximo deve ser maior ou igual ao mínimo.');return;}
  const p=new URLSearchParams();
  if(search.trim())p.set('search',search.trim());
  if(category!=='Todas')p.set('category',category);
  if(city.trim())p.set('city',city.trim());
  if(mode!=='Todos')p.set('mode',mode==='Remoto'?'remoto':'presencial');
  if(a!==null)p.set('min',String(a));if(b!==null)p.set('max',String(b));
  Q(p.toString());P(1);F(false);
 }
 return <MarketScreen title="Oportunidades" subtitle="Encontre serviços ou acompanhe seus anúncios.">
  <Button label="+ Publicar oportunidade" onPress={()=>router.push('/mercado/publicar')}/>
  <Choices label="O que você quer ver?" options={['Explorar','Minhas publicações','Propostas enviadas','Meus trabalhos']} value={tab} onChange={setTab}/>
  {tab!=='Explorar'?<MyActivity tab={tab==='Minhas publicações'?'posts':tab==='Propostas enviadas'?'proposals':'works'}/>:<>
   <Field label="Buscar oportunidades" placeholder="Ex.: eletricista, design, manutenção..." value={search} maxLength={100} onChangeText={S} onSubmitEditing={apply}/>
   <Button label="Buscar" variant="outline" onPress={apply}/>
   <Button label={filters?'Fechar filtros':'Filtrar por cidade, categoria ou valor'} variant="ghost" onPress={()=>F(!filters)}/>
   {filters?<Card>
    <Choices label="Categoria" options={['Todas',...CATEGORIES]} value={category} onChange={C}/>
    <Field label="Cidade" value={city} maxLength={100} onChangeText={City}/>
    <Choices label="Atendimento" options={['Todos','Remoto','Presencial']} value={mode} onChange={M}/>
    <Field label="Valor mínimo (R$)" value={min} onChangeText={Min} keyboardType="decimal-pad"/>
    <Field label="Valor máximo (R$)" value={max} onChangeText={Max} keyboardType="decimal-pad"/>
    <Button label="Aplicar filtros" onPress={apply}/>
    <Button label="Limpar filtros" variant="ghost" onPress={()=>{S('');C('Todas');City('');M('Todos');Min('');Max('');Q('');P(1);F(false);E('');}}/>
   </Card>:null}
   {filterError?<Note error>{filterError}</Note>:null}
   {d.loading?<Note>Carregando...</Note>:d.error?<><Note error>{d.error}</Note><Button label="Tentar novamente" onPress={()=>void d.load()}/></>:!d.data?.posts.length?<Card><Note>Nenhuma oportunidade encontrada. Tente outra busca ou publique o serviço de que precisa.</Note></Card>:d.data.posts.map((p:any)=><PostCard key={p.id} post={p}/>)}
   <View style={{gap:8}}>
    {page>1?<Button label="Página anterior" variant="outline" onPress={()=>P(page-1)}/>:null}
    {d.data?.posts.length===20?<Button label="Próxima página" variant="outline" onPress={()=>P(page+1)}/>:null}
   </View>
  </>}
  <Button label="Encontrar profissionais" variant="ghost" onPress={()=>router.push('/mercado/profissionais')}/>
  <Button label="Meu perfil profissional" variant="ghost" onPress={()=>router.push('/mercado/perfil-profissional')}/>
  {me.data?.moderator?<Button label="Moderar publicações e denúncias" variant="outline" onPress={()=>router.push('/mercado/moderacao')}/>:null}
  <Button label="Regras e segurança" variant="ghost" onPress={()=>router.push('/regras-mercado')}/>
 </MarketScreen>;
}
