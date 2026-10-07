import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen, ScreenHeader } from '../../shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../shared/theme';
import type { LegalDocument } from './legal-content';

/**
 * Renderiza a Politica de Privacidade ou os Termos de Uso.
 * O conteudo vem de legal-content.ts - aqui so cuidamos da aparencia.
 */
export function LegalScreen({ document }: { document: LegalDocument }) {
  useThemeMode();
  const router = useRouter();

  // Estas paginas sao abertas direto pelo link publico (a Google Play exige
  // isso), entao quem chega aqui pode nem estar logado. O voltar cai na
  // abertura do app, que decide para onde mandar.
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <Screen scroll>
      <ScreenHeader title={document.title} subtitle={document.subtitle} onBack={goBack} />

      {document.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={styles.heading}>{section.heading}</Text>

          {section.paragraphs?.map((paragraph) => (
            <Text key={paragraph} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}

          {section.bullets?.map((bullet) => (
            <View key={bullet} style={styles.bulletRow}>
              <View style={styles.dot} />
              <Text style={styles.bulletText}>{bullet}</Text>
            </View>
          ))}
        </View>
      ))}

      <Text style={styles.footer}>
        Duvidas sobre este documento? Fale com a gente pelo e-mail indicado no final.
      </Text>
    </Screen>
  );
}

const styles = createThemedStyles(() => ({
  section: {
    marginTop: theme.spacing.xl,
  },
  heading: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  paragraph: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    marginTop: 7,
    marginRight: theme.spacing.sm,
  },
  bulletText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  footer: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.lg,
  },
}));
