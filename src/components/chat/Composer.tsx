import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, Icon, IconButton, Sheet, type SheetRef, Text } from '@/components/ui';
import { uid } from '@/lib/id';
import { monitoring } from '@/lib/monitoring';
import { toast } from '@/store/toast';
import { makeStyles, radii, sizes, spacing, typography, useTheme } from '@/theme';
import type { MessageAttachment } from '@/types/domain';

const MAX_ATTACHMENTS = 4;
const MAX_LENGTH = 2000;
const IMAGE_QUALITY = 0.8;
const COMPOSER_MAX_LINES_HEIGHT = sizes.textArea;

interface ComposerProps {
  onSend: (text: string, attachments: MessageAttachment[], quickReply?: boolean) => void;
  quickReplies: readonly string[];
  disabled?: boolean;
}

/**
 * Поле ввода чата: текст, вложения (фото из галереи, документы), быстрые ответы.
 * Отступ снизу плавно убирается, когда открыта клавиатура (без «двойного» safe area).
 */
export function Composer({ onSend, quickReplies, disabled = false }: ComposerProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { progress } = useReanimatedKeyboardAnimation();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const attachSheet = useRef<SheetRef>(null);

  const bottomStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(progress.get(), [0, 1], [Math.max(insets.bottom, spacing.sm), spacing.sm]),
  }));

  const canSend = !disabled && (text.trim().length > 0 || attachments.length > 0);

  const send = () => {
    if (!canSend) return;
    onSend(text.trim(), attachments);
    setText('');
    setAttachments([]);
  };

  const addAttachments = (items: MessageAttachment[]) =>
    setAttachments((current) => [...current, ...items].slice(0, MAX_ATTACHMENTS));

  const pickPhotos = async () => {
    attachSheet.current?.dismiss();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_ATTACHMENTS - attachments.length,
        quality: IMAGE_QUALITY,
      });
      if (result.canceled) return;
      addAttachments(
        result.assets.map((asset) => ({
          id: uid('att'),
          kind: 'image' as const,
          uri: asset.uri,
          name: asset.fileName ?? t('chat.photo'),
          size: asset.fileSize ?? null,
          mimeType: asset.mimeType ?? 'image/jpeg',
        })),
      );
    } catch (error) {
      monitoring.captureException(error, { scope: 'chat.pickPhotos' });
      toast.error(t('chat.permissionDenied'));
    }
  };

  const pickDocument = async () => {
    attachSheet.current?.dismiss();
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      addAttachments(
        result.assets.map((asset) => ({
          id: uid('att'),
          kind: 'file' as const,
          uri: asset.uri,
          name: asset.name,
          size: asset.size ?? null,
          mimeType: asset.mimeType ?? null,
        })),
      );
    } catch (error) {
      monitoring.captureException(error, { scope: 'chat.pickDocument' });
      toast.error(t('errors.generic'));
    }
  };

  return (
    <Animated.View style={[styles.root, bottomStyle]}>
      {quickReplies.length > 0 && text.length === 0 && attachments.length === 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quick} keyboardShouldPersistTaps="always">
          {quickReplies.map((reply) => (
            <Chip key={reply} label={reply} onPress={() => onSend(reply, [], true)} disabled={disabled} />
          ))}
        </ScrollView>
      ) : null}

      {attachments.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pending}>
          {attachments.map((attachment) => (
            <View key={attachment.id} style={styles.pendingItem}>
              {attachment.kind === 'image' ? (
                <Image source={{ uri: attachment.uri }} style={styles.pendingImage} contentFit="cover" />
              ) : (
                <View style={[styles.pendingImage, styles.pendingFile]}>
                  <Icon name="document-text-outline" size="lg" color={colors.gold} />
                  <Text variant="micro" numberOfLines={1} style={styles.pendingName}>
                    {attachment.name}
                  </Text>
                </View>
              )}
              <Pressable
                style={styles.remove}
                onPress={() => setAttachments((current) => current.filter((a) => a.id !== attachment.id))}
                hitSlop={sizes.hitSlop}
                accessibilityRole="button"
                accessibilityLabel={t('common.delete')}
              >
                <Icon name="close" size="xs" color={colors.white} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.bar}>
        <IconButton
          icon="add"
          variant="surface"
          onPress={() => attachSheet.current?.present()}
          disabled={disabled || attachments.length >= MAX_ATTACHMENTS}
          accessibilityLabel={t('chat.attachTitle')}
        />
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t('chat.placeholder')}
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.gold}
          cursorColor={colors.gold}
          multiline
          // в вебе multiline-поле — это textarea с двумя строками по умолчанию
          numberOfLines={Platform.OS === 'web' ? 1 : undefined}
          maxLength={MAX_LENGTH}
          editable={!disabled}
          accessibilityLabel={t('chat.placeholder')}
        />
        <IconButton icon="arrow-up" variant={canSend ? 'gold' : 'surface'} onPress={send} disabled={!canSend} haptic="light" accessibilityLabel={t('common.send')} />
      </View>

      <Sheet ref={attachSheet} title={t('chat.attachTitle')}>
        <View style={styles.attachOptions}>
          <Pressable style={styles.attachOption} onPress={() => void pickPhotos()} accessibilityRole="button">
            <View style={styles.attachIcon}>
              <Icon name="image-outline" size="lg" color={colors.gold} />
            </View>
            <Text variant="bodyStrong">{t('chat.attachPhoto')}</Text>
          </Pressable>
          <Pressable style={styles.attachOption} onPress={() => void pickDocument()} accessibilityRole="button">
            <View style={styles.attachIcon}>
              <Icon name="document-attach-outline" size="lg" color={colors.gold} />
            </View>
            <Text variant="bodyStrong">{t('chat.attachFile')}</Text>
          </Pressable>
        </View>
      </Sheet>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    paddingTop: spacing.sm,
    borderTopWidth: sizes.border,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.background,
    gap: spacing.sm,
  },
  quick: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  pending: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  pendingItem: {
    width: sizes.avatar.lg,
    height: sizes.avatar.lg,
  },
  pendingImage: {
    width: sizes.avatar.lg,
    height: sizes.avatar.lg,
    borderRadius: radii.md,
    backgroundColor: t.colors.surface,
  },
  pendingFile: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  pendingName: {
    maxWidth: sizes.avatar.lg - spacing.sm,
  },
  remove: {
    position: 'absolute',
    top: -spacing.xs,
    right: -spacing.xs,
    width: sizes.icon.md,
    height: sizes.icon.md,
    borderRadius: radii.pill,
    backgroundColor: t.colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: t.colors.text,
    minHeight: sizes.iconButton.md,
    maxHeight: COMPOSER_MAX_LINES_HEIGHT,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm + spacing.xxs,
    paddingBottom: spacing.sm + spacing.xxs,
    borderRadius: radii.xl,
    backgroundColor: t.colors.inputBackground,
    borderWidth: sizes.border,
    borderColor: t.colors.inputBorder,
  },
  attachOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  attachOption: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  attachIcon: {
    width: sizes.iconButton.lg,
    height: sizes.iconButton.lg,
    borderRadius: radii.md,
    backgroundColor: t.colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
