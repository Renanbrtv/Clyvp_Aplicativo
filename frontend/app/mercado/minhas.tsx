import { useEffect,useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { MarketScreen,Choices,Note,useData } from '../../src/features/marketplace/ui';
import { MyActivity } from '../../src/features/marketplace/MyActivity';
export default function Mine(){
 const params=useLocalSearchParams<{tab?:string;sent?:string}>();
 const me=useData('/market/me');
 const [tab,setTab]=useState('Minhas publicações');
 useEffect(()=>{setTab(params.tab==='proposals'?'Propostas enviadas':params.tab==='works'?'Meus trabalhos':'Minhas publicações');},[params.tab]);
 return <MarketScreen title="Minha atividade">
 {params.sent==='1'?<Note>Enviado para análise! Você pode acompanhar sua publicação aqui. Ela ficará visível para outras pessoas após a aprovação.</Note>:null}
 <Choices label="Acompanhar" options={['Minhas publicações','Propostas enviadas','Meus trabalhos']} value={tab} onChange={setTab}/>
 <MyActivity tab={tab==='Minhas publicações'?'posts':tab==='Propostas enviadas'?'proposals':'works'}/>
 {me.data?.accountId?<Note>Seu ID de conta: {me.data.accountId}</Note>:null}
 </MarketScreen>;
}
