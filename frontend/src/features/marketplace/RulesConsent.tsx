import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Text, Note, styles, theme } from './ui';
export function RulesConsent({value,onChange}:{value:boolean;onChange:(value:boolean)=>void}) {
  const router=useRouter();
  return <Card>
    <Text style={styles.title}>Regras para publicar</Text>
    <Note>Publique somente serviços e pedidos legais. Não são permitidos nudez, conteúdo sexual, venda de armas ou drogas, violência explícita, golpes, ameaças ou discriminação.</Note>
    <Note>Use fotos próprias ou autorizadas. Não exponha documentos, endereço completo ou dados de outras pessoas.</Note>
    <Note>O anúncio e as fotos passam por análise antes de aparecerem para outras pessoas. Alterações precisam de nova aprovação.</Note>
    <Button label="Ler todas as regras" variant="ghost" onPress={()=>router.push('/regras-mercado')} />
    <Pressable accessibilityRole="checkbox" accessibilityState={{checked:value}} accessibilityLabel="Li e aceito as regras do marketplace" onPress={()=>onChange(!value)} style={{paddingVertical:12,minHeight:48}}>
      <Text style={[styles.label,{color:theme.colors.primaryInk}]}>{value?'☑':'☐'} Li e aceito as regras do marketplace</Text>
    </Pressable>
  </Card>;
}
