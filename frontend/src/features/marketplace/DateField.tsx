import { useState } from 'react';
import { Pressable } from 'react-native';
import { Button, Card, Text, View, Note, styles, theme, prettyDay } from './ui';
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function DateField({ label, value, onChange, optional = true }: {
  label: string; value: string; onChange: (v: string) => void; optional?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => value ? new Date(value + 'T12:00:00') : new Date());
  const first = new Date(month.getFullYear(),month.getMonth(),1);
  const count = new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const today = iso(new Date());
  return <View style={{ gap: 8 }}>
    <Text style={styles.label}>{label}</Text>
    <Button label={value ? prettyDay(value) : 'Escolher no calendário'} variant="outline" onPress={() => setOpen(!open)} />
    {open ? <Card>
      <View style={styles.row}>
        <Button label="Anterior" variant="ghost" onPress={() => setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))} />
        <Text style={[styles.label,{flex:1,textAlign:'center'}]}>{month.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</Text>
        <Button label="Próximo" variant="ghost" onPress={() => setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))} />
      </View>
      <View style={{flexDirection:'row'}}>{['D','S','T','Q','Q','S','S'].map((v,i) => <Text key={i} style={[styles.text,{width:'14.285%',textAlign:'center'}]}>{v}</Text>)}</View>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>
        {Array.from({length:first.getDay()+count},(_,i) => {
          const day = i-first.getDay()+1;
          if(day<1) return <View key={i} style={{width:'14.285%',height:44}} />;
          const date = iso(new Date(month.getFullYear(),month.getMonth(),day));
          const disabled = date < today;
          return <Pressable key={i} accessibilityRole="button" accessibilityLabel={prettyDay(date)} accessibilityState={{disabled,selected:date===value}} disabled={disabled}
            onPress={() => {onChange(date);setOpen(false);}}
            style={{width:'14.285%',minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:date===value?theme.colors.primary:undefined,opacity:disabled?0.3:1}}>
            <Text style={{color:date===value?'#111111':theme.colors.text}}>{day}</Text>
          </Pressable>;
        })}
      </View>
      {optional ? <Button label="Sem prazo definido" variant="ghost" onPress={() => {onChange('');setOpen(false);}} /> : null}
    </Card> : null}
    {optional && !value ? <Note>Opcional. Você pode combinar o prazo depois.</Note> : null}
  </View>;
}
