import { Platform, StyleSheet, type ViewProps } from 'react-native';

import { Colors, UI } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedView } from '@/components/themed-view';

export type AppCardProps = ViewProps & {
  variant?: 'default' | 'soft';
};

export function AppCard({ style, variant = 'default', ...rest }: AppCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const backgroundColor =
    variant === 'soft' ? Colors[scheme].surface : Colors[scheme].card;

  return (
    <ThemedView
      style={[
        styles.card,
        {
          backgroundColor,
          borderColor: Colors[scheme].border,
          shadowColor: scheme === 'dark' ? '#000' : '#0B1220',
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: UI.radius.lg,
    padding: UI.spacing.md,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
});

