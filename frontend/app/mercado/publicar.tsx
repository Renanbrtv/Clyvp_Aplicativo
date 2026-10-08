import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, MarketScreen, Field, Choices, Picture, Note, Button, Card, useAction, Feedback, CATEGORIES, amount, moneyInput } from '../../src/features/marketplace/ui';
import { DateField } from '../../src/features/marketplace/DateField';
import { RulesConsent } from '../../src/features/marketplace/RulesConsent';
export default function Publicar() {
  const router = useRouter(), action = useAction();
  const { id } = useLocalSearchParams<{id?:string}>();
  const [f,setF] = useState({title:'',category:'Outros',description:'',city:'',region:'',mode:'remoto',budgetFrom:'',budgetTo:'',dueDate:''});
  const [photos,setPhotos] = useState<(string|null)[]>([null,null]);
  const [accepted,setAccepted] = useState(false);
  const [errors,setErrors] = useState<Record<string,string>>({});
  const [ready,setReady] = useState(!id), [loadError,setLoadError] = useState('');
  async function load() {
    if(!id) return;
    setLoadError('');
    try {
      const {post:p} = await api.get<any>('/market/posts/'+id);
      setF({title:p.title,category:p.category,description:p.description,city:p.city,region:p.region,mode:p.mode,budgetFrom:moneyInput(p.budget_from),budgetTo:moneyInput(p.budget_to),dueDate:p.due_date??''});
      setPhotos([p.photos[0]??null,p.photos[1]??null]);
    } catch(e) {setLoadError(e instanceof Error?e.message:'Não foi possível abrir sua publicação.');}
    finally {setReady(true);}
  }
  useEffect(()=>{void load();},[id]);
  const set=(key:string,value:string)=>{setF(v=>({...v,[key]:value}));setErrors(v=>({...v,[key]:''}));};
  function validate() {
    const e:Record<string,string>={};
    if(f.title.trim().length<5) e.title='Escreva um título com pelo menos 5 caracteres.';
    if(f.description.trim().length<20) e.description='Conte um pouco mais: use pelo menos 20 caracteres.';
    if(f.mode==='presencial'&&!f.city.trim()) e.city='Informe a cidade onde o serviço será realizado.';
    const from=amount(f.budgetFrom),to=amount(f.budgetTo);
    for(const [key,v] of [['budgetFrom',from],['budgetTo',to]] as const) if(v!==null&&(!Number.isFinite(v)||v<0||v>9999999)) e[key]='Informe um valor válido entre R$ 0 e R$ 9.999.999.';
    if(from!==null&&to!==null&&to<from) e.budgetTo='O valor máximo deve ser maior ou igual ao inicial.';
    if(f.dueDate&&f.dueDate<new Date().toISOString().slice(0,10)) e.dueDate='Escolha hoje ou uma data futura.';
    if(!accepted)e.rules='Marque o aceite das regras para continuar.';
    setErrors(e);return Object.keys(e).length===0;
  }
  return <MarketScreen title={id?'Editar publicação':'Publicar oportunidade'} subtitle="Conte o que você precisa e receba propostas." loading={!ready} error={loadError} retry={()=>void load()}>
    <Field label="O que você precisa?" placeholder="Ex.: Preciso instalar duas câmeras" value={f.title} onChangeText={v=>set('title',v)} maxLength={120} error={errors.title}/>
    <Choices label="Categoria" options={CATEGORIES} value={f.category} onChange={v=>set('category',v)}/>
    <Field label="Descreva o serviço" placeholder="Explique o que precisa ser feito e os detalhes importantes." value={f.description} onChangeText={v=>set('description',v)} multiline maxLength={3000} error={errors.description}/>
    <Choices label="Como será realizado?" options={['Remoto','Presencial']} value={f.mode==='remoto'?'Remoto':'Presencial'} onChange={v=>set('mode',v==='Remoto'?'remoto':'presencial')}/>
    {f.mode==='presencial'?<>
      <Field label="Cidade" value={f.city} maxLength={100} onChangeText={v=>set('city',v)} error={errors.city}/>
      <Field label="Bairro (opcional)" value={f.region} maxLength={100} onChangeText={v=>set('region',v)}/>
    </>:null}
    <DateField label="Quando precisa? (opcional)" value={f.dueDate} onChange={v=>set('dueDate',v)}/>
    {errors.dueDate?<Note error>{errors.dueDate}</Note>:null}
    <Field label="Orçamento inicial (R$, opcional)" placeholder="100,00" value={f.budgetFrom} keyboardType="decimal-pad" onChangeText={v=>set('budgetFrom',v)} error={errors.budgetFrom}/>
    <Field label="Orçamento máximo (R$, opcional)" value={f.budgetTo} keyboardType="decimal-pad" onChangeText={v=>set('budgetTo',v)} error={errors.budgetTo}/>
    <Note>Sem orçamento? Deixe os valores em branco para combinar depois.</Note>
    {photos.map((photo,i)=><Card key={i}><Picture value={photo} label={'Adicionar foto '+(i+1)+' (opcional)'} onChange={v=>setPhotos(old=>old.map((x,n)=>n===i?v:x))}/></Card>)}
    <RulesConsent value={accepted} onChange={v=>{setAccepted(v);setErrors(e=>({...e,rules:''}));}}/>
    {errors.rules?<Note error>{errors.rules}</Note>:null}
    <Feedback action={action}/>
    <Button label={id?'Salvar e enviar para análise':'Enviar para análise'} loading={action.busy} onPress={()=>{
      if(!validate()) return;
      void action.run(async()=>{
        try {
          await api.post(id?'/market/posts/'+id+'/edit':'/market/posts',{...f,latitude:null,longitude:null,budgetFrom:amount(f.budgetFrom),budgetTo:amount(f.budgetTo),dueDate:f.dueDate||null,photos:photos.filter(Boolean),acceptRules:accepted});
          router.replace('/mercado/minhas?tab=posts&sent=1' as any);
        } catch(e) {
          const details=(e as any)?.details;
          if(Array.isArray(details)) setErrors(Object.fromEntries(details.map((d:any)=>[d.field,'Revise este campo e tente novamente.'])));
          throw e;
        }
      });
    }}/>
    <Note>Seu anúncio aparecerá em Minhas publicações enquanto aguarda análise. Não há prazo garantido de aprovação.</Note>
  </MarketScreen>;
}
