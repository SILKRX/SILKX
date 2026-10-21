import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { Icon, type IconName, Text } from '@/components/ui';
import { formatFileSize, formatTime } from '@/lib/format';
import { layout, makeStyles, motion, opacity, radii, sizes, spacing, typography, useTheme } from '@/theme';
import type { ChatMessage, MessageAttachment, MessageStatus } from '@/types/domain';

const STATUS_ICON: Record<MessageStatus, IconName> = {
  sending: 'time-outline',
  sent: 'checkmark',
  delivered: 'checkmark-done',
  read: 'checkmark-done',
  failed: 'alert-circle',
};

const IMAGE_ASPECT = layout.cardImageAspect;

function AttachmentView({ attachment, own, width }: { attachment: MessageAttachment; own: boolean; width: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (attachment.kind === 'image') {
    return (
      <Image
        source={{ uri: attachment.uri }}
        style={[styles.image, { width, height: Math.round(width / IMAGE_ASPECT) }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={motion.fast}
        accessibilityLabel={attachment.name}
      />
    );
  }
  const fg = own ? colors.bubbleOwnText : colors.bubbleOtherText;
  return (
    <View style={[styles.file, own ? styles.fileOwn : styles.fileOther]}>
      <View style={styles.fileIcon}>
        <Icon name="document-text-outline" size="md" color={colors.gold} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodySm" style={{ color: fg }} numberOfLines={1}>
          {attachment.name}
        </Text>
        {attachment.size ? (
          <Text variant="caption" style={[{ color: fg }, styles.muted]}>
            {formatFileSize(attachment.size)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  own: boolean;
  onRetry?: () => void;
}

/** Пузырь сообщения: текст, вложения, время и статус доставки (✓ / ✓✓ / прочитано). */
export function MessageBubble({ message, own, onRetry }: MessageBubbleProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const maxWidth = Math.round(width * sizes.chatBubbleMax);
  const mediaWidth = maxWidth - spacing.sm * 2;
  const failed = message.status === 'failed';
  const textColor = own ? colors.bubbleOwnText : colors.bubbleOtherText;
  const readColor = isDark ? colors.accent : colors.gold;
  const statusColor = failed ? colors.danger : message.status === 'read' ? readColor : textColor;

  return (
    <View style={[styles.row, own ? styles.rowOwn : styles.rowOther]}>
      <Pressable
        disabled={!failed || !onRetry}
        onPress={onRetry}
        style={[styles.bubble, { maxWidth }, own ? styles.own : styles.other, failed && styles.failed]}
        accessibilityRole={failed ? 'button' : undefined}
        accessibilityLabel={failed ? t('chat.failed') : undefined}
      >
        {message.attachments.map((attachment) => (
          <AttachmentView key={attachment.id} attachment={attachment} own={own} width={mediaWidth} />
        ))}
        {message.text ? (
          <Text style={[styles.text, { color: textColor }]} selectable>
            {message.text}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <Text variant="micro" style={[{ color: textColor }, styles.muted]}>
            {formatTime(new Date(message.createdAt))}
          </Text>
          {own ? (
            <Icon
              name={STATUS_ICON[message.status]}
              size={sizes.icon.xs}
              color={statusColor}
              accessibilityLabel={message.status}
            />
          ) : null}
        </View>
      </Pressable>
      {failed ? (
        <Text variant="caption" color="danger" style={styles.failedText}>
          {t('chat.failed')}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: {
    flex: 1,
  },
  row: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.xxs,
  },
  rowOwn: {
    alignItems: 'flex-end',
  },
  rowOther: {
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs + spacing.xxs,
    borderRadius: radii.lg,
    gap: spacing.xs,
  },
  own: {
    backgroundColor: t.colors.bubbleOwn,
    borderBottomRightRadius: radii.xs,
  },
  other: {
    backgroundColor: t.colors.bubbleOther,
    borderBottomLeftRadius: radii.xs,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  failed: {
    opacity: opacity.muted,
  },
  text: {
    ...typography.body,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing.xs,
  },
  muted: {
    opacity: opacity.muted,
  },
  image: {
    borderRadius: radii.md,
    backgroundColor: t.colors.skeleton,
  },
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  fileOwn: {
    backgroundColor: t.colors.overlay,
  },
  fileOther: {
    backgroundColor: t.colors.surfaceMuted,
  },
  fileIcon: {
    width: sizes.iconButton.sm,
    height: sizes.iconButton.sm,
    borderRadius: radii.sm,
    backgroundColor: t.colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failedText: {
    marginTop: spacing.xxs,
  },
}));
