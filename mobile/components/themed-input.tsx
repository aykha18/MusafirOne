import { StyleSheet, TextInput, TouchableOpacity, View, type TextInputProps } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedInputProps = TextInputProps & {
  lightColor?: string;
  darkColor?: string;
  onPress?: () => void;
};

export function ThemedInput({
  style,
  lightColor,
  darkColor,
  onPress,
  ...rest
}: ThemedInputProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    'background',
  );
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');
  const placeholderColor = useThemeColor({}, 'icon');

  const input = (
    <TextInput
      style={[
        styles.input,
        {
          backgroundColor,
          color: textColor,
          borderColor,
        },
        style,
        { pointerEvents: onPress ? 'none' : 'auto' } as any,
      ]}
      placeholderTextColor={placeholderColor}
      editable={!onPress}
      {...rest}
    />
  );

  if (onPress) {
    return (
      <TouchableOpacity 
        onPress={() => {
          console.log('ThemedInput: TouchableOpacity pressed');
          onPress();
        }} 
        activeOpacity={0.8}
      >
        <View style={{ pointerEvents: 'none' }}>{input}</View>
      </TouchableOpacity>
    );
  }

  return input;
}

const styles = StyleSheet.create({
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});

