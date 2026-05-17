import React from 'react';
import { Pressable, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';
import {
  IconToday,
  IconRecords,
  IconGear,
  IconProfile,
  IconPlus,
  type IconProps,
} from '@/src/ui/icons';

export type TabKey = 'today' | 'records' | 'gear' | 'profile';

export interface TabBarProps {
  active: TabKey;
  onChange: (key: TabKey) => void;
  onNewPress: () => void;
}

interface TabSpec {
  key: TabKey;
  label: string;
  Icon: React.ComponentType<IconProps>;
}

const TABS: TabSpec[] = [
  { key: 'today', label: 'Today', Icon: IconToday },
  { key: 'records', label: 'Records', Icon: IconRecords },
  { key: 'gear', label: 'Gear', Icon: IconGear },
  { key: 'profile', label: 'Profile', Icon: IconProfile },
];

export function TabBar({ active, onChange, onNewPress }: TabBarProps) {
  const { theme, tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const isHeliotype = theme.key === 'heliotype';

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: Math.max(insets.bottom, 12) + 8,
    backgroundColor: tokens.bg,
    borderTopWidth: 1,
    borderTopColor: tokens.lineSoft,
  };

  const leftTabs = TABS.slice(0, 2);
  const rightTabs = TABS.slice(2);

  return (
    <View style={containerStyle}>
      <View style={{ flexDirection: 'row', flex: 1, justifyContent: 'space-around' }}>
        {leftTabs.map((t) => (
          <TabItem
            key={t.key}
            tabKey={t.key}
            label={t.label}
            Icon={t.Icon}
            active={active === t.key}
            onPress={() => onChange(t.key)}
          />
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New entry"
        onPress={onNewPress}
        style={({ pressed }) => [
          {
            width: 84,
            alignItems: 'center',
            justifyContent: 'center',
          },
          pressed ? { transform: [{ scale: 0.94 }, { rotate: '-8deg' }] } : null,
        ]}
      >
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tokens.accent,
            shadowColor: isHeliotype ? '#1A1410' : tokens.accent,
            shadowOffset: { width: 0, height: isHeliotype ? 3 : 12 },
            shadowOpacity: isHeliotype ? 1 : 0.45,
            shadowRadius: isHeliotype ? 0 : 18,
            elevation: 8,
            borderWidth: isHeliotype ? 2 : 0,
            borderColor: isHeliotype ? '#1A1410' : 'transparent',
          }}
        >
          <IconPlus size={26} color={tokens.accentInk} fill={tokens.accentInk} fillOpacity={0.2} />
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', flex: 1, justifyContent: 'space-around' }}>
        {rightTabs.map((t) => (
          <TabItem
            key={t.key}
            tabKey={t.key}
            label={t.label}
            Icon={t.Icon}
            active={active === t.key}
            onPress={() => onChange(t.key)}
          />
        ))}
      </View>
    </View>
  );
}

interface TabItemProps {
  tabKey: TabKey;
  label: string;
  Icon: React.ComponentType<IconProps>;
  active: boolean;
  onPress: () => void;
}

function TabItem({ label, Icon, active, onPress }: TabItemProps) {
  const { tokens } = useTheme();
  const color = active ? tokens.text : tokens.textDim;
  const fill = active ? tokens.accent : tokens.textFaint;

  const labelStyle: TextStyle = {
    fontFamily: 'Manrope_600SemiBold',
    fontWeight: '600',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.2,
    color,
    marginTop: 3,
  };

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          paddingVertical: 8,
          paddingHorizontal: 6,
          borderRadius: 12,
        },
        pressed ? { transform: [{ scale: 0.96 }] } : null,
      ]}
    >
      <Icon size={22} color={color} fill={fill} />
      <Text selectable={false} style={labelStyle}>
        {label}
      </Text>
    </Pressable>
  );
}
