import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type { ReactNode, Ref } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, opacity, radii, sizes, spacing, useTheme } from '@/theme';

import { Text } from './Text';

export type SheetRef = BottomSheetModal;

interface SheetProps {
  ref: Ref<BottomSheetModal>;
  children: ReactNode;
  title?: string;
  /** Без snapPoints — высота по содержимому */
  snapPoints?: (string | number)[];
  scrollable?: boolean;
  footer?: ReactNode;
  onDismiss?: () => void;
}

function Backdrop(props: BottomSheetBackdropProps) {
  return <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={opacity.overlay} pressBehavior="close" />;
}

/** Bottom sheet SILKX поверх @gorhom/bottom-sheet: тема, затемнение, клавиатура, safe area. */
export function Sheet({ ref, children, title, snapPoints, scrollable = false, footer, onDismiss }: SheetProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const Body = scrollable ? BottomSheetScrollView : BottomSheetView;

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      backdropComponent={Backdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={{ backgroundColor: colors.borderStrong, width: sizes.handle.width, height: sizes.handle.height }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      onDismiss={onDismiss}
    >
      <Body
        style={styles.body}
        contentContainerStyle={scrollable ? { paddingBottom: (footer ? spacing.lg : insets.bottom) + spacing.lg } : undefined}
      >
        {title ? (
          <Text variant="h3" style={styles.title}>
            {title}
          </Text>
        ) : null}
        {children}
        {!scrollable && !footer ? <View style={{ height: insets.bottom + spacing.lg }} /> : null}
      </Body>
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>{footer}</View> : null}
    </BottomSheetModal>
  );
}

const useStyles = makeStyles((t) => ({
  background: {
    backgroundColor: t.colors.surfaceElevated,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
  },
  body: {
    paddingHorizontal: spacing.lg,
  },
  title: {
    marginBottom: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: sizes.border,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.surfaceElevated,
  },
}));
