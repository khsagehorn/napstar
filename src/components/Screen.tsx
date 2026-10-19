import { useMemo, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme, type Theme } from '@/theme';

type Props = {
  children: ReactNode;
  /** Safe-area edges to pad. Screens under a native header usually skip 'top'. */
  edges?: Edge[];
};

/** Themed, keyboard-safe, scrollable screen container. */
export function Screen({ children, edges = ['top', 'bottom'] }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    flex: { flex: 1 },
    content: {
      flexGrow: 1,
      padding: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
  });
