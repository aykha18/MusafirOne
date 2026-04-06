import { Pressable, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';

export function SegmentedControl<T extends string>(props: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const scheme = useColorScheme() ?? 'light';

  return (
    <View style={[styles.container, { backgroundColor: Colors[scheme].surface, borderColor: Colors[scheme].border }]}>
      {props.options.map((opt) => {
        const active = opt.value === props.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => props.onChange(opt.value)}
            style={({ pressed }) => [
              styles.item,
              active
                ? { backgroundColor: Colors[scheme].background, borderColor: Colors[scheme].border }
                : { backgroundColor: 'transparent' },
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <ThemedText
              type="defaultSemiBold"
              style={[
                styles.label,
                { color: active ? Colors[scheme].tint : Colors[scheme].icon },
              ]}
            >
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 999,
    padding: 4,
    gap: 6,
  },
  item: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
  },
});
