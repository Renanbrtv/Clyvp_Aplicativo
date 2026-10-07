import { Text, View } from 'react-native';
import { Button, Screen, ScreenHeader } from '../src/shared/components';
import { theme, useThemeMode, type ThemePreference } from '../src/shared/theme';
export default function AparenciaScreen() {
 const { preference, setPreference } = useThemeMode();
 return <Screen><ScreenHeader title="Aparencia" subtitle="Escolha como o Clyvo aparece neste aparelho." /><View style={{ gap: 16, paddingTop: 24 }}>
 {([['claro','Claro'],['escuro','Escuro'],['sistema','Seguir o sistema']] as [ThemePreference,string][]).map(([key,label]) => <Button key={key} label={`${label}${preference === key ? ' ✓' : ''}`} variant={preference === key ? 'primary' : 'outline'} onPress={() => { void setPreference(key); }} />)}
 <Text style={{ color: theme.colors.textSecondary }}>Sua escolha fica salva neste aparelho e pode ser alterada a qualquer momento.</Text>
 </View></Screen>;
}
