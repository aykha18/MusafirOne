// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'arrow.left.arrow.right': 'swap-horiz',
  'paperplane.fill': 'send',
  'shippingbox.fill': 'local-shipping',
  'dollarsign.circle': 'attach-money',
  'doc.text': 'description',
  tshirt: 'checkroom',
  'fork.knife': 'restaurant',
  iphone: 'devices',
  pills: 'medication',
  cube: 'inventory-2',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'bubble.left.fill': 'chat',
  'person.fill': 'person',
  bell: 'notifications-none',
  'checkmark.seal.fill': 'verified',
  magnifyingglass: 'search',
  'line.3.horizontal.decrease.circle': 'tune',
  'info.circle': 'info-outline',
  'square.and.pencil': 'edit',
  'camera.fill': 'photo-camera',
  'star.fill': 'star',
  'person.2.fill': 'groups',
  globe: 'language',
  'lock.fill': 'lock',
  'questionmark.circle': 'help-outline',
  gift: 'card-giftcard',
  'rectangle.portrait.and.arrow.right': 'logout',
  airplane: 'flight-takeoff',
  calendar: 'event',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
