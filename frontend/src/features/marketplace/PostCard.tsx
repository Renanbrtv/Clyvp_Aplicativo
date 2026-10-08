import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button,Card,Text,View,Image,Note,styles,theme,currency,categoryLabel } from './ui';
export const moderationLabel=(state:string)=>({approved:'Publicado',pending:'Em análise',rejected:'Não aprovado'}[state]??'Em análise');
export function PostCard({post:p,own=false}:{post:any;own?:boolean}) {
 const router=useRouter();
 const price=p.budget_from!=null&&p.budget_to!=null?currency(p.budget_from)+' a '+currency(p.budget_to):p.budget_to!=null?'Até '+currency(p.budget_to):p.budget_from!=null?'A partir de '+currency(p.budget_from):'Valor a combinar';
 return <Card style={{gap:12}}>
   <View style={{flexDirection:'row',gap:12,alignItems:'flex-start'}}>
     {p.thumbnail?<Image source={{uri:p.thumbnail}} style={{width:88,height:104,borderRadius:12}} accessibilityLabel={'Foto: '+p.title}/>:<View style={{width:88,height:104,borderRadius:12,backgroundColor:theme.colors.surfaceSoft,alignItems:'center',justifyContent:'center'}}><Feather name="briefcase" size={28} color={theme.colors.textMuted}/></View>}
     <View style={{flex:1,gap:6}}>
       <Text style={styles.label}>{p.title}</Text>
       <Text style={styles.price}>{price}</Text>
       <Note>{categoryLabel(p.category)}</Note>
       <Note>{p.mode==='remoto'?'Serviço remoto':[p.city,p.region].filter(Boolean).join(' · ')}</Note>
     </View>
   </View>
   {own?<>
     <Note>{p.hidden?'Removido pela moderação':p.status!=='aberta'?({cancelada:'Encerrado',contratada:'Profissional contratado'}[p.status as string]??p.status):moderationLabel(p.moderation_state)}</Note>
     <Note>{p.view_count??0} pessoas visualizaram · {p.proposal_count??0} propostas recebidas</Note>
     {p.moderation_note?<Note>Mensagem da equipe: {p.moderation_note}</Note>:null}
   </>:p.mine?<Note>Sua publicação</Note>:null}
   <Button label={own||p.mine?'Acompanhar publicação':'Ver oportunidade'} variant="outline" onPress={()=>router.push(('/mercado/oportunidade?id='+p.id) as any)}/>
 </Card>;
}
