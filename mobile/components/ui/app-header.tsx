import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, UI } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

export function AppHeader(props: {
  title: string;
  subtitle?: string;
  leftInitial?: string;
  rightIconName?: string;
  onPressRightIcon?: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const leftInitial = (props.leftInitial ?? props.title).trim().slice(0, 1).toUpperCase();
  const rightIconName = props.rightIconName ?? 'bell';

  return (
    <ThemedView style={styles.container} lightColor={Colors.light.background} darkColor={Colors.dark.background}>
      <View style={styles.left}>
        <View style={[styles.avatar, { backgroundColor: Colors[scheme].tint }]}>
          <ThemedText type="defaultSemiBold" style={styles.avatarText} lightColor="#fff" darkColor="#fff">
            {leftInitial}
          </ThemedText>
        </View>
        <View style={styles.titleBlock}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {props.title}
          </ThemedText>
          {props.subtitle ? (
            <View style={[styles.subtitlePill, { backgroundColor: scheme === 'dark' ? 'rgba(77, 163, 255, 0.15)' : 'rgba(10, 126, 164, 0.12)' }]}>
              <IconSymbol size={14} name="checkmark.seal.fill" color={Colors[scheme].tint} />
              <ThemedText style={[styles.subtitle, { color: Colors[scheme].tint }]}>{props.subtitle}</ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      <Pressable
        onPress={props.onPressRightIcon}
        style={({ pressed }) => [
          styles.rightButton,
          { backgroundColor: Colors[scheme].surface, opacity: pressed ? 0.7 : 1 },
        ]}
        hitSlop={8}
      >
        <IconSymbol size={20} name={rightIconName as any} color={Colors[scheme].icon} />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: UI.spacing.lg,
    paddingTop: UI.spacing.lg,
    paddingBottom: UI.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI.spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    lineHeight: 18,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 18,
    lineHeight: 22,
  },
  subtitlePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 14,
  },
  rightButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

