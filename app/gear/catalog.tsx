import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGearCatalogSearch } from '@/src/domain/gear/use-gear';
import type { GearCatalogEntry, GearCategory } from '@/src/domain/gear/types';
import { writeGearCatalogPick } from '@/src/storage/gear-catalog-pick';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  Card,
  ChipSelect,
  EmptyState,
  Field,
  IconBtn,
  TopBar,
} from '@/src/ui/primitives/v2';
import {
  GEAR_ICON,
  IconArrowLeft,
  IconChevron,
  IconSearch,
} from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';

type CategoryFilter = GearCategory | null;

const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '__all__', label: 'All' },
  { value: 'harness', label: 'Harness' },
  { value: 'helmet', label: 'Helmet' },
  { value: 'rope', label: 'Rope' },
  { value: 'lanyard', label: 'Lanyard' },
  { value: 'sling', label: 'Sling' },
  { value: 'descender', label: 'Descender' },
  { value: 'ascender', label: 'Ascender' },
  { value: 'carabiner', label: 'Carabiner' },
  { value: 'pulley', label: 'Pulley' },
  { value: 'other', label: 'Other' },
];

export default function GearCatalogScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<CategoryFilter>(null);

  // Debounce the query so each keystroke doesn't fire a fresh SQL search.
  // 200ms is short enough that typing feels live but coalesces fast typing.
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(id);
  }, [query]);

  const search = useGearCatalogSearch(debouncedQuery, filter, 60);
  const results = search.data ?? [];
  const trimmedQuery = debouncedQuery.trim();
  const hasInput = trimmedQuery.length >= 2 || Boolean(filter);

  async function pick(entry: GearCatalogEntry) {
    haptics.selection();
    await writeGearCatalogPick({
      manufacturer: entry.manufacturer,
      model: entry.model,
      category: entry.category,
      image_url: entry.image_url,
    });
    router.back();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: tokens.bg }}
    >
      <TopBar
        title="Gear catalog"
        subtitle="Pick to prefill your new item"
        leading={
          <IconBtn
            icon={IconArrowLeft}
            label="Back"
            size="sm"
            onPress={() => router.back()}
          />
        }
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 4, gap: 12 }}>
        <Field
          value={query}
          onChangeText={setQuery}
          placeholder="Search manufacturer or model…"
          suffix={<IconSearch size={16} color={tokens.textDim} />}
          autoCapitalize="none"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ChipSelect
            value={filter ?? '__all__'}
            options={CATEGORY_OPTIONS}
            onChange={(v) => setFilter(v === '__all__' ? null : (v as GearCategory))}
          />
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1, marginTop: 12 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 24 + insets.bottom,
          gap: 8,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {!hasInput ? (
          <View style={{ paddingTop: 24 }}>
            <EmptyState
              icon={IconSearch}
              title="Start typing or pick a category"
              sub="The catalog is large (~960 items) — narrowing helps you find what you need fast."
            />
          </View>
        ) : results.length === 0 && !search.isFetching ? (
          <View style={{ paddingTop: 24 }}>
            <EmptyState
              icon={IconSearch}
              title={`Nothing matches "${trimmedQuery || filter}"`}
              sub="Try a different keyword or clear the category filter."
            />
          </View>
        ) : (
          results.map((entry) => (
            <CatalogRow key={entry.id} entry={entry} onPress={() => pick(entry)} />
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CatalogRow({
  entry,
  onPress,
}: {
  entry: GearCatalogEntry;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  const Icon = GEAR_ICON[entry.category];

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: tokens.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.lineSoft,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Pick ${entry.manufacturer} ${entry.model}`}
      onPress={onPress}
      style={({ pressed }) => [
        containerStyle,
        pressed ? { transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          backgroundColor: tokens.surface2,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Schema carries an optional licensed product image_url; when
            present we render it, otherwise the category icon stands in. */}
        {entry.image_url ? (
          <Image
            source={{ uri: entry.image_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Icon size={22} color={tokens.text} fill={tokens.accent} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...type.cardTitle, color: tokens.text }} numberOfLines={1}>
          {entry.manufacturer}
        </Text>
        <Text style={{ ...type.cardSub, color: tokens.textDim }} numberOfLines={1}>
          {entry.model}
        </Text>
      </View>
      <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>
        {entry.category.toUpperCase()}
      </Text>
      <IconChevron size={14} color={tokens.textFaint} />
    </Pressable>
  );
}
