import { Pressable, StyleSheet, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { ThemedText } from './themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedButtonProps = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
  textStyle?: StyleProp<TextStyle>;
};

export function ThemedButton({
  title,
  variant = 'primary',
  disabled,
  style,
  textStyle,
  fullWidth = false,
  ...rest
}: ThemedButtonProps) {
  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'background');
  const iconColor = useThemeColor({}, 'icon');
  const errorColor = '#ff3b30'; // Standard iOS red

  const backgroundColor =
    variant === 'primary'
      ? disabled
        ? iconColor
        : tint
      : variant === 'danger'
      ? errorColor
      : 'transparent';

  const borderColor =
    variant === 'secondary'
      ? iconColor
      : backgroundColor;

  return (
    <Pressable
      style={(state) => {
        const resolvedStyle: StyleProp<ViewStyle> =
          typeof style === 'function' ? style(state) : style;
        return [
          styles.base,
          {
            width: fullWidth ? '100%' : undefined,
            opacity: disabled ? 0.6 : state.pressed ? 0.8 : 1,
            backgroundColor,
            borderColor,
          },
          resolvedStyle,
        ];
      }}
      disabled={disabled}
      {...rest}
    >
      <ThemedText
        type="defaultSemiBold"
        style={[
          styles.label,
          {
            color: variant === 'secondary' ? iconColor : textColor,
          },
          textStyle,
        ]}
      >
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textTransform: 'uppercase',
  },
});
