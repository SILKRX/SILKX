import * as Speech from 'expo-speech';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, {
  cancelAnimation,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { Button, Chip, Icon, IconButton, type IconName, Text } from '@/components/ui';
import { answer, type AssistantAction, type AssistantReply, greeting, quickQuestions, toSpeech } from '@/features/assistant/engine';
import { priceLabel, propertyTitle } from '@/features/property/format';
import { useComplex, useProperty } from '@/hooks/api/catalog';
import { useStartChat } from '@/hooks/api/engagement';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { errorMessageKey } from '@/lib/errors';
import { uid } from '@/lib/id';
import { callPhone } from '@/lib/linking';
import { formatUzPhone } from '@/lib/phone';
import { toast } from '@/store/toast';
import { layout, makeStyles, radii, sizes, spacing, typography, useTheme } from '@/theme';
import type { DistrictId } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

interface Message extends AssistantReply {
  id: string;
  role: 'ai' | 'user';
}

/** Районы, которые можно передать параметром ?district= */
const DISTRICT_SET: Record<DistrictId, true> = {
  'mirzo-ulugbek': true,
  yunusabad: true,
  chilanzar: true,
  yakkasaray: true,
  mirabad: true,
  shaykhantahur: true,
  almazar: true,
  sergeli: true,
  uchtepa: true,
  bektemir: true,
  yashnabad: true,
  yangihayot: true,
};

const THINK_MS = { min: 450, perChar: 2, max: 1100 } as const;
const MAX_LENGTH = 500;

const ACTION_ICON: Record<AssistantAction, IconName> = {
  tour: 'cube-outline',
  book: 'calendar-outline',
  call: 'call-outline',
  chat: 'chatbubble-ellipses-outline',
  search: 'search-outline',
  sell: 'add-circle-outline',
  support: 'help-buoy-outline',
  mortgage: 'calculator-outline',
};

/** Голос синтезатора под язык интерфейса. Для узбекского, если голоса нет, берём турецкий — латиница читается близко. */
const VOICE_FALLBACK: Record<string, string> = { ru: 'ru-RU', uz: 'tr-TR', en: 'en-US', zh: 'zh-CN', ko: 'ko-KR', tr: 'tr-TR' };

async function pickVoiceLanguage(lang: string): Promise<string> {
  const wanted = lang in VOICE_FALLBACK ? lang : 'ru';
  const fallback = VOICE_FALLBACK[wanted] ?? 'ru-RU';
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const match = voices.find((v) => v.language.toLowerCase().startsWith(wanted));
    return match ? match.language : fallback;
  } catch {
    return fallback;
  }
}

/** Аватар ассистента: золотой круг, который «дышит», пока SILKX AI говорит. */
function AiAvatar({ speaking, size }: { speaking: boolean; size: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (speaking) {
      pulse.set(withRepeat(withSequence(withTiming(1, { duration: 520 }), withTiming(0, { duration: 520 })), -1));
    } else {
      cancelAnimation(pulse);
      pulse.set(withTiming(0, { duration: 200 }));
    }
  }, [speaking, pulse]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.55 * pulse.get(),
    transform: [{ scale: 1 + 0.28 * pulse.get() }],
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, ring]} />
      <LinearGradient colors={[colors.gold, '#8F6C3D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        <Icon name="sparkles" size={Math.round(size * 0.5)} color={colors.textOnGold} />
      </LinearGradient>
    </View>
  );
}

function SoundBar({ index }: { index: number }) {
  const styles = useStyles();
  const level = useSharedValue(0.3);
  useEffect(() => {
    const duration = 260 + index * 90;
    level.set(withRepeat(withSequence(withTiming(1, { duration }), withTiming(0.25, { duration })), -1, true));
    return () => cancelAnimation(level);
  }, [index, level]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: level.get() }] }));
  return <Animated.View style={[styles.bar, style]} />;
}

/** «Эквалайзер» рядом со статусом, пока ассистент говорит */
function SoundBars() {
  const styles = useStyles();
  return (
    <View style={styles.bars}>
      <SoundBar index={0} />
      <SoundBar index={1} />
      <SoundBar index={2} />
    </View>
  );
}

export default function AssistantScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const requireAuth = useRequireAuth();
  const startChat = useStartChat();
  const { propertyId, district: districtParam } = useLocalSearchParams<{ propertyId?: string; district?: string }>();
  const district = districtParam && districtParam in DISTRICT_SET ? (districtParam as DistrictId) : null;

  const propertyQuery = useProperty(propertyId ?? '');
  const property = propertyId ? (propertyQuery.data ?? null) : null;
  const complexQuery = useComplex(property?.complexId ?? '');
  const complex = property?.complexId ? (complexQuery.data ?? null) : null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [voice, setVoice] = useState(true);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const voiceLang = useRef('ru-RU');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greeted = useRef(false);

  const ctx = useMemo(() => ({ t, property, complex, district }), [t, property, complex, district]);
  const quick = useMemo(() => quickQuestions(t, Boolean(property)), [t, property]);

  useEffect(() => {
    void pickVoiceLanguage(i18n.language).then((lang) => {
      voiceLang.current = lang;
    });
  }, [i18n.language]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      void Speech.stop();
    },
    [],
  );

  const speak = (message: Message) => {
    void Speech.stop();
    Speech.speak(toSpeech(message.text, t), {
      language: voiceLang.current,
      rate: 1,
      pitch: 1,
      onStart: () => setSpeakingId(message.id),
      onDone: () => setSpeakingId((id) => (id === message.id ? null : id)),
      onStopped: () => setSpeakingId((id) => (id === message.id ? null : id)),
      onError: () => setSpeakingId(null),
    });
  };

  const stopSpeaking = () => {
    void Speech.stop();
    setSpeakingId(null);
  };

  const pushAi = (reply: AssistantReply, autoSpeak: boolean) => {
    const message: Message = { ...reply, id: uid('ai'), role: 'ai' };
    setMessages((list) => [...list, message]);
    if (autoSpeak) speak(message);
  };

  // Приветствие — когда данные объекта загрузились (или сразу, если объекта нет)
  const ready = !propertyId || Boolean(property);
  useEffect(() => {
    if (!ready || greeted.current) return;
    greeted.current = true;
    pushAi(greeting(ctx), voice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q || thinking) return;
    stopSpeaking();
    setMessages((list) => [...list, { id: uid('me'), role: 'user', text: q, actions: [] }]);
    setText('');
    setThinking(true);
    const reply = answer(q, ctx);
    const delay = Math.min(THINK_MS.max, THINK_MS.min + reply.text.length * THINK_MS.perChar);
    timer.current = setTimeout(() => {
      setThinking(false);
      pushAi(reply, voice);
    }, delay);
  };

  const toggleVoice = () => {
    const next = !voice;
    setVoice(next);
    if (!next) stopSpeaking();
    toast.info(next ? t('assistant.voiceOn') : t('assistant.voiceOff'));
  };

  const runAction = (action: AssistantAction) => {
    stopSpeaking();
    const id = property?.id;
    switch (action) {
      case 'tour':
        if (id) router.push({ pathname: '/tour/[id]', params: { id } });
        break;
      case 'book':
        if (id) requireAuth(() => router.push({ pathname: '/book/[id]', params: { id } }), `/book/${id}`);
        break;
      case 'call':
        if (property) {
          void callPhone(property.seller.phone).then((ok) => {
            if (!ok) toast.info(t('property.callUnavailable'), formatUzPhone(property.seller.phone));
          });
        }
        break;
      case 'chat':
        if (id) {
          requireAuth(() => {
            startChat.mutate(id, {
              onSuccess: (conversation) => router.push({ pathname: '/chats/[id]', params: { id: conversation.id } }),
              onError: (error) => toast.error(t(errorMessageKey(error))),
            });
          }, `/property/${id}`);
        }
        break;
      case 'mortgage':
        if (router.canGoBack()) router.back();
        else if (id) router.replace({ pathname: '/property/[id]', params: { id } });
        break;
      case 'search':
        router.push('/(tabs)/catalog');
        break;
      case 'sell':
        router.push('/(tabs)/profile');
        break;
      case 'support':
        router.push('/support');
        break;
    }
  };

  const inverted = useMemo(() => [...messages].reverse(), [messages]);
  const speaking = speakingId !== null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" variant="ghost" onPress={() => router.back()} accessibilityLabel={t('common.back')} />
        <AiAvatar speaking={speaking} size={sizes.avatar.sm} />
        <View style={styles.flex}>
          <Text variant="title">{t('assistant.title')}</Text>
          <View style={styles.statusRow}>
            {speaking ? <SoundBars /> : <View style={styles.dot} />}
            <Text variant="caption" color="gold">
              {speaking ? t('assistant.speaking') : t('assistant.online')}
            </Text>
          </View>
        </View>
        {speaking ? (
          <IconButton icon="stop-circle-outline" variant="surface" onPress={stopSpeaking} accessibilityLabel={t('assistant.stop')} />
        ) : null}
        <IconButton
          icon={voice ? 'volume-high-outline' : 'volume-mute-outline'}
          variant={voice ? 'gold' : 'surface'}
          onPress={toggleVoice}
          accessibilityLabel={voice ? t('assistant.voiceOn') : t('assistant.voiceOff')}
        />
      </View>

      {property ? (
        <Pressable style={styles.propertyCard} onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/property/[id]', params: { id: property.id } }))}>
          {property.images[0] ? <Image source={{ uri: property.images[0] }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" /> : null}
          <View style={styles.flex}>
            <Text variant="bodySm" numberOfLines={1}>
              {propertyTitle(property, t)}
            </Text>
            <Text variant="bodyStrong" numberOfLines={1}>
              {priceLabel(property, t)}
            </Text>
          </View>
          <Button title={t('tour.title')} size="sm" variant="secondary" leftIcon="cube-outline" onPress={() => runAction('tour')} />
        </Pressable>
      ) : null}

      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <FlatList<Message>
          data={inverted}
          inverted
          keyExtractor={(m) => m.id}
          renderItem={({ item }) =>
            item.role === 'user' ? (
              <Animated.View entering={FadeInDown.duration(220)} style={[styles.row, styles.rowUser]}>
                <View style={[styles.bubble, styles.userBubble]}>
                  <Text style={[styles.text, { color: colors.bubbleOwnText }]}>{item.text}</Text>
                </View>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInDown.duration(260)} style={[styles.row, styles.rowAi]}>
                <AiAvatar speaking={speakingId === item.id} size={sizes.avatar.xs} />
                <View style={styles.aiColumn}>
                  <View style={[styles.bubble, styles.aiBubble]}>
                    <Text style={styles.text} selectable>
                      {item.text}
                    </Text>
                    <Pressable
                      style={styles.listen}
                      onPress={() => (speakingId === item.id ? stopSpeaking() : speak(item))}
                      hitSlop={sizes.hitSlop}
                      accessibilityRole="button"
                      accessibilityLabel={speakingId === item.id ? t('assistant.stop') : t('assistant.listen')}
                    >
                      <Icon name={speakingId === item.id ? 'stop-circle' : 'volume-high-outline'} size="sm" color={colors.gold} />
                      <Text variant="caption" color="gold">
                        {speakingId === item.id ? t('assistant.stop') : t('assistant.listen')}
                      </Text>
                    </Pressable>
                  </View>
                  {item.actions.length > 0 ? (
                    <View style={styles.actions}>
                      {item.actions.map((action) => (
                        <Chip key={action} label={t(`assistant.action.${action}`)} icon={ACTION_ICON[action]} onPress={() => runAction(action)} />
                      ))}
                    </View>
                  ) : null}
                </View>
              </Animated.View>
            )
          }
          ListHeaderComponent={thinking ? <TypingIndicator /> : undefined}
          ListFooterComponent={
            <Text variant="caption" color="tertiary" align="center" style={styles.disclaimer}>
              {t('assistant.disclaimer')}
            </Text>
          }
          contentContainerStyle={styles.list}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quick} keyboardShouldPersistTaps="always">
            {quick.map((q) => (
              <Chip key={q} label={q} onPress={() => ask(q)} disabled={thinking} />
            ))}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={property ? t('assistant.placeholder') : t('assistant.subtitle')}
              placeholderTextColor={colors.placeholder}
              selectionColor={colors.gold}
              cursorColor={colors.gold}
              maxLength={MAX_LENGTH}
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => ask(text)}
              accessibilityLabel={t('assistant.placeholder')}
            />
            <IconButton
              icon="arrow-up"
              variant={text.trim() ? 'gold' : 'surface'}
              onPress={() => ask(text)}
              disabled={!text.trim() || thinking}
              haptic="light"
              accessibilityLabel={t('common.send')}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: sizes.border,
    borderBottomColor: t.colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: t.colors.online,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 12,
  },
  bar: {
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: t.colors.gold,
  },
  ring: {
    position: 'absolute',
    backgroundColor: t.colors.gold,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: layout.screenPadding,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  thumb: {
    width: sizes.avatar.md,
    height: sizes.avatar.md,
    borderRadius: radii.md,
    backgroundColor: t.colors.skeleton,
  },
  list: {
    paddingVertical: spacing.md,
  },
  row: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.xs,
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  rowAi: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  aiColumn: {
    flexShrink: 1,
    maxWidth: '88%',
    gap: spacing.sm,
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  userBubble: {
    maxWidth: '82%',
    backgroundColor: t.colors.bubbleOwn,
    borderBottomRightRadius: radii.xs,
  },
  aiBubble: {
    gap: spacing.sm,
    backgroundColor: t.colors.bubbleOther,
    borderWidth: sizes.border,
    borderColor: t.colors.goldBorder,
    borderBottomLeftRadius: radii.xs,
  },
  text: {
    ...typography.body,
    color: t.colors.bubbleOtherText,
  },
  listen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  disclaimer: {
    paddingHorizontal: layout.screenPadding * 2,
    paddingBottom: spacing.md,
  },
  composer: {
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: sizes.border,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.background,
  },
  quick: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: t.colors.text,
    minHeight: sizes.iconButton.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: t.colors.inputBackground,
    borderWidth: sizes.border,
    borderColor: t.colors.inputBorder,
  },
}));
