import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Pressable, View } from 'react-native';

import { FeatureGate } from '@/components/system/AppSync';
import { Button, ChipGroup, Icon, SegmentedControl, Switch, Text, TextField } from '@/components/ui';
import { DISTRICT_IDS } from '@/constants/districts';
import { propertyTitle, priceLabel, renovationLabel } from '@/features/property/format';
import { useAddressSearch } from '@/hooks/api/business';
import { useDebouncedValue } from '@/hooks/common';
import { isLanguage } from '@/i18n';
import { analytics } from '@/lib/analytics';
import { formatArea, formatNumber } from '@/lib/format';
import { monitoring } from '@/lib/monitoring';
import { api } from '@/services/api';
import type { ListingDraft } from '@/store/listingDraft';
import { toast } from '@/store/toast';
import { layout, makeStyles, motion, opacity, radii, sizes, spacing, useTheme } from '@/theme';
import type { AmenityId, DealType, PropertyType, Renovation } from '@/types/domain';

import { LocationPicker } from './LocationPicker';
import { PhotoGrid } from './PhotoGrid';

export interface StepProps {
  draft: ListingDraft;
  update: (patch: Partial<ListingDraft>) => void;
  errorFor: (field: keyof ListingDraft) => string | undefined;
}

const DEAL_TYPES: readonly DealType[] = ['sale', 'rent'];
const PROPERTY_TYPES: readonly PropertyType[] = ['apartment', 'house', 'townhouse', 'commercial'];
const RENOVATIONS: readonly Renovation[] = ['shell', 'whitebox', 'euro', 'designer'];
const AMENITIES: readonly AmenityId[] = ['wifi', 'parking', 'security', 'panoramic', 'elevator', 'conditioner', 'furniture', 'appliances', 'playground', 'gym', 'concierge', 'balcony'];
const ROOM_OPTIONS = [0, 1, 2, 3, 4, 5] as const;
const DESCRIPTION_MAX = 2000;
const PHOTO_QUALITY = 0.8;
const NUMBER_MAX_LENGTH = 9;

function parseNumber(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : null;
}

function NumberField({ label, value, onChange, error, prefix }: { label: string; value: number | null; onChange: (value: number | null) => void; error?: string; prefix?: string }) {
  const styles = useStyles();
  return (
    <TextField
      label={label}
      value={value === null ? '' : formatNumber(value)}
      onChangeText={(text) => onChange(parseNumber(text))}
      keyboardType="number-pad"
      maxLength={NUMBER_MAX_LENGTH + 2}
      error={error}
      containerStyle={styles.flex}
      prefix={
        prefix ? (
          <Text variant="bodyStrong" color="gold">
            {prefix}
          </Text>
        ) : undefined
      }
    />
  );
}

function SwitchRow({ title, hint, value, onChange }: { title: string; hint?: string; value: boolean; onChange: (value: boolean) => void }) {
  const styles = useStyles();
  return (
    <View style={styles.switchRow}>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        {hint ? (
          <Text variant="bodySm" color="secondary">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={title} />
    </View>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Text variant="caption" color="secondary">
      {children}
    </Text>
  );
}

// ─────────────────────────────── Шаг 1. Основное

export function BasicsStep({ draft, update, errorFor }: StepProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <View style={styles.step}>
      <View style={styles.field}>
        <Label>{t('wizard.dealType')}</Label>
        <SegmentedControl
          options={DEAL_TYPES.map((value) => ({ value, label: t(`dealType.${value}`) }))}
          value={draft.dealType}
          onChange={(dealType) => update({ dealType, installment: dealType === 'rent' ? false : draft.installment })}
        />
      </View>
      <View style={styles.field}>
        <Label>{t('wizard.propertyType')}</Label>
        <ChipGroup
          mode="single"
          allowEmpty={false}
          options={PROPERTY_TYPES.map((value) => ({ value, label: t(`propertyType.${value}`) }))}
          value={[draft.type]}
          onChange={(next) => {
            const type = next[0];
            if (type) update({ type });
          }}
        />
      </View>
      <NumberField
        label={draft.dealType === 'rent' ? t('wizard.priceRent') : t('wizard.price')}
        prefix="$"
        value={draft.price}
        onChange={(price) => update({ price })}
        error={errorFor('price')}
      />
      <NumberField label={t('wizard.area')} value={draft.area} onChange={(area) => update({ area })} error={errorFor('area')} />
      <View style={styles.field}>
        <Label>{t('wizard.rooms')}</Label>
        <ChipGroup
          mode="single"
          allowEmpty={false}
          options={ROOM_OPTIONS.map((value) => ({ value, label: value === 0 ? t('rooms.studio') : String(value) }))}
          value={draft.rooms === null ? [] : [draft.rooms as (typeof ROOM_OPTIONS)[number]]}
          onChange={(next) => {
            const rooms = next[0];
            if (rooms !== undefined) update({ rooms });
          }}
        />
        {errorFor('rooms') ? (
          <Text variant="caption" color="danger">
            {errorFor('rooms')}
          </Text>
        ) : null}
      </View>
      <View style={styles.row}>
        {draft.type !== 'house' ? (
          <NumberField label={t('wizard.floor')} value={draft.floor} onChange={(floor) => update({ floor })} error={errorFor('floor')} />
        ) : null}
        <NumberField label={t('wizard.floorsTotal')} value={draft.floorsTotal} onChange={(floorsTotal) => update({ floorsTotal })} error={errorFor('floorsTotal')} />
      </View>
    </View>
  );
}

// ─────────────────────────────── Шаг 2. Локация

export function LocationStep({ draft, update, errorFor }: StepProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const query = useDebouncedValue(draft.address, motion.searchDebounce);
  const suggestions = useAddressSearch(focused ? query : '');
  const [resolving, setResolving] = useState(false);

  const pinMoved = async (coords: { latitude: number; longitude: number }) => {
    update({ coords });
    setResolving(true);
    try {
      const place = await api.geo.reverse(coords);
      update({ coords, district: place.district, address: draft.address.trim().length > 0 ? draft.address : place.label });
    } catch (error) {
      monitoring.captureException(error, { scope: 'wizard.reverseGeocode' });
    } finally {
      setResolving(false);
    }
  };

  return (
    <View style={styles.step}>
      <TextField
        label={t('wizard.address')}
        placeholder={t('wizard.addressPlaceholder')}
        leftIcon="search"
        value={draft.address}
        onChangeText={(address) => update({ address })}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCorrect={false}
        error={errorFor('address') ?? errorFor('coords') ?? errorFor('district')}
      />
      {focused && suggestions.data && suggestions.data.length > 0 ? (
        <View style={styles.suggestions}>
          {suggestions.data.map((place) => (
            <Pressable
              key={place.id}
              style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
              onPress={() => {
                update({ address: place.label, district: place.district, coords: place.coords });
                setFocused(false);
                Keyboard.dismiss();
              }}
              accessibilityRole="button"
            >
              <Icon name="location-outline" size="sm" color={colors.gold} />
              <View style={styles.flex}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {place.label}
                </Text>
                <Text variant="caption" color="secondary">
                  {t(`districts.${place.district}`)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      <LocationPicker value={draft.coords} onChange={(coords) => void pinMoved(coords)} />
      <View style={styles.hintRow}>
        <Icon name="hand-left-outline" size="xs" color={colors.textTertiary} />
        <Text variant="caption" color="tertiary" style={styles.flex}>
          {t('wizard.pinHint')}
        </Text>
      </View>
      {draft.district ? (
        <View style={styles.districtRow}>
          <Icon name="checkmark-circle" size="sm" color={colors.success} />
          <Text variant="bodyStrong">{t('wizard.districtDetected', { district: t(`districts.${draft.district}`) })}</Text>
          {resolving ? (
            <Text variant="caption" color="tertiary">
              {t('common.loading')}
            </Text>
          ) : null}
        </View>
      ) : null}
      {!draft.district ? (
        <View style={styles.field}>
          <Label>{t('filters.district')}</Label>
          <ChipGroup
            mode="single"
            options={DISTRICT_IDS.map((id) => ({ value: id, label: t(`districts.${id}`) }))}
            value={[]}
            onChange={(next) => {
              const district = next[0];
              if (district) update({ district });
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────── Шаг 3. Детали

export function DetailsStep({ draft, update, errorFor }: StepProps) {
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  const generate = useMutation({
    mutationFn: () => {
      const language = isLanguage(i18n.language) ? i18n.language : 'ru';
      const districtName = draft.district ? t(`districts.${draft.district}`) : '';
      return api.ai.generateDescription(draft, language, districtName);
    },
    onSuccess: (description) => {
      update({ description });
      analytics.track('ai_description_generated', { length: description.length });
      toast.success(t('wizard.aiDone'));
    },
    onError: () => toast.error(t('errors.generic')),
  });

  return (
    <View style={styles.step}>
      <View style={styles.field}>
        <Label>{t('wizard.renovation')}</Label>
        <ChipGroup
          mode="single"
          allowEmpty={false}
          options={RENOVATIONS.map((value) => ({ value, label: t(`renovation.${value}`) }))}
          value={[draft.renovation]}
          onChange={(next) => {
            const renovation = next[0];
            if (renovation) update({ renovation });
          }}
        />
      </View>
      <SwitchRow title={t('wizard.furnished')} value={draft.furnished} onChange={(furnished) => update({ furnished })} />
      {draft.dealType === 'sale' ? (
        <SwitchRow title={t('wizard.installment')} hint={t('filters.installmentHint')} value={draft.installment} onChange={(installment) => update({ installment })} />
      ) : null}
      <View style={styles.field}>
        <Label>{t('wizard.amenities')}</Label>
        <ChipGroup
          options={AMENITIES.map((value) => ({ value, label: t(`amenities.${value}`) }))}
          value={draft.amenities}
          onChange={(amenities) => update({ amenities })}
        />
      </View>
      <View style={styles.field}>
        <TextField
          label={t('wizard.description')}
          placeholder={t('wizard.descriptionPlaceholder')}
          multiline
          maxLength={DESCRIPTION_MAX}
          value={draft.description}
          onChangeText={(description) => update({ description })}
          error={errorFor('description')}
          helper={`${draft.description.length}/${DESCRIPTION_MAX}`}
        />
        <FeatureGate flag="aiDescription">
          <Button
            title={generate.isPending ? t('wizard.aiGenerating') : t('wizard.aiGenerate')}
            variant="outline"
            leftIcon="sparkles"
            loading={generate.isPending}
            onPress={() => generate.mutate()}
            fullWidth
          />
        </FeatureGate>
      </View>
    </View>
  );
}

// ─────────────────────────────── Шаг 4. Фото

export function MediaStep({ draft, update, errorFor }: StepProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const remaining = layout.photosMax - draft.photos.length;

  const addPhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: PHOTO_QUALITY,
        orderedSelection: true,
      });
      if (result.canceled) return;
      const picked = result.assets.map((asset) => asset.uri).filter((uri) => !draft.photos.includes(uri));
      update({ photos: [...draft.photos, ...picked].slice(0, layout.photosMax) });
    } catch (error) {
      monitoring.captureException(error, { scope: 'wizard.addPhotos' });
      toast.error(t('wizard.permissionDenied'));
    }
  };

  return (
    <View style={styles.step}>
      <Pressable
        style={[styles.dropzone, remaining <= 0 && styles.dropzoneDisabled]}
        onPress={() => void addPhotos()}
        disabled={remaining <= 0}
        accessibilityRole="button"
      >
        <Icon name="images-outline" size="xxl" color={colors.gold} />
        <Text variant="bodyStrong">{t('wizard.addPhotos')}</Text>
        <Text variant="caption" color="secondary">
          {t('wizard.photosCount', { count: draft.photos.length, max: layout.photosMax })}
        </Text>
      </Pressable>
      {errorFor('photos') ? (
        <Text variant="caption" color="danger">
          {errorFor('photos')}
        </Text>
      ) : null}
      {draft.photos.length > 0 ? (
        <Text variant="caption" color="tertiary">
          {t('wizard.photosHint')}
        </Text>
      ) : null}
      <PhotoGrid photos={draft.photos} onChange={(photos) => update({ photos })} />
    </View>
  );
}

// ─────────────────────────────── Шаг 5. Проверка

function ReviewRow({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.reviewRow}>
      <Text variant="bodySm" color="secondary">
        {label}
      </Text>
      <Text variant="bodyStrong" style={styles.reviewValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <View style={styles.reviewSection}>
      <View style={styles.reviewHeader}>
        <Text variant="title">{title}</Text>
        <Button title={t('common.edit')} variant="ghost" size="sm" onPress={onEdit} />
      </View>
      {children}
    </View>
  );
}

export function ReviewStep({ draft, goTo }: { draft: ListingDraft; goTo: (index: number) => void }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const cover = draft.photos[0];
  const preview = { type: draft.type, rooms: draft.rooms ?? 0, area: draft.area ?? 0 };
  const dash = '—';

  return (
    <View style={styles.step}>
      <Text color="secondary">{t('wizard.reviewHint')}</Text>
      {cover ? <Image source={{ uri: cover }} style={styles.reviewCover} contentFit="cover" /> : null}
      <View>
        <Text variant="price">{draft.price ? priceLabel({ price: draft.price, dealType: draft.dealType }, t) : dash}</Text>
        <Text variant="bodyStrong">{propertyTitle(preview, t)}</Text>
      </View>
      <ReviewSection title={t('wizard.steps.basics')} onEdit={() => goTo(0)}>
        <ReviewRow label={t('wizard.dealType')} value={t(`dealType.${draft.dealType}`)} />
        <ReviewRow label={t('wizard.propertyType')} value={t(`propertyType.${draft.type}`)} />
        <ReviewRow label={t('wizard.area')} value={draft.area ? `${formatArea(draft.area)} ${t('units.sqm')}` : dash} />
        <ReviewRow label={t('wizard.rooms')} value={draft.rooms === null ? dash : draft.rooms === 0 ? t('rooms.studio') : String(draft.rooms)} />
        {draft.type !== 'house' ? (
          <ReviewRow label={t('wizard.floor')} value={draft.floor && draft.floorsTotal ? t('property.floorOf', { floor: draft.floor, total: draft.floorsTotal }) : dash} />
        ) : null}
      </ReviewSection>
      <ReviewSection title={t('wizard.steps.location')} onEdit={() => goTo(1)}>
        <ReviewRow label={t('wizard.address')} value={draft.address || dash} />
        <ReviewRow label={t('filters.district')} value={draft.district ? t(`districts.${draft.district}`) : dash} />
      </ReviewSection>
      <ReviewSection title={t('wizard.steps.details')} onEdit={() => goTo(2)}>
        <ReviewRow label={t('wizard.renovation')} value={renovationLabel(draft.renovation, t)} />
        <ReviewRow label={t('wizard.furnished')} value={draft.furnished ? t('common.yes') : t('common.no')} />
        <ReviewRow label={t('wizard.amenities')} value={draft.amenities.length ? draft.amenities.map((a) => t(`amenities.${a}`)).join(', ') : dash} />
        <Text variant="bodySm" color="secondary" numberOfLines={layout.descriptionPreviewLines}>
          {draft.description || dash}
        </Text>
      </ReviewSection>
      <ReviewSection title={t('wizard.steps.media')} onEdit={() => goTo(3)}>
        <ReviewRow label={t('wizard.addPhotos')} value={String(draft.photos.length)} />
      </ReviewSection>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: {
    flex: 1,
  },
  step: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  suggestions: {
    marginTop: -spacing.sm,
    borderRadius: radii.md,
    backgroundColor: t.colors.surfaceElevated,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xxs,
  },
  suggestionPressed: {
    backgroundColor: t.colors.surfacePressed,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  districtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dropzone: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    borderRadius: radii.xl,
    borderWidth: sizes.borderStrong,
    borderStyle: 'dashed',
    borderColor: t.colors.goldBorder,
    backgroundColor: t.colors.goldSoft,
  },
  dropzoneDisabled: {
    opacity: opacity.disabled,
  },
  reviewCover: {
    height: layout.masterPlanHeight,
    borderRadius: radii.xl,
    backgroundColor: t.colors.skeleton,
  },
  reviewSection: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  reviewValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
}));
