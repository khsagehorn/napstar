import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useSelectedChild } from '@/hooks/useSelectedChild';
import { useTheme, type Theme } from '@/theme';

/** Chips for picking a child. Renders nothing when there is only one. */
export function ChildSwitcher() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { children, child: selected, selectChild } = useSelectedChild();

  if (!children || children.length < 2) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist">
      {children.map((c) => {
        const isSelected = c._id === selected?._id;
        return (
          <Pressable
            key={c._id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Show ${c.name}`}
            onPress={() => {
              if (isSelected) return;
              void Haptics.selectionAsync();
              selectChild(c._id);
            }}
            style={({ pressed }) => [
              styles.chip,
              isSelected && styles.chipSelected,
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.label, isSelected && styles.labelSelected]} numberOfLines={1}>
              {c.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    row: { gap: theme.spacing.sm },
    chip: {
      minHeight: theme.sizes.minTouchTarget,
      minWidth: theme.sizes.minTouchTarget,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    pressed: { opacity: 0.6 },
    label: { ...theme.typography.bodyStrong, color: theme.colors.text },
    labelSelected: { color: theme.colors.textOnPrimary },
  });
