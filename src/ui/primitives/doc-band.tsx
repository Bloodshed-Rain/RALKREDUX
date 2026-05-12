import React from 'react';
import { Text, View } from 'react-native';
import { MarqueeText } from './marquee-text';
import { useTheme } from '../theme/theme-provider';

interface DocBandTopProps {
  variant: 'top';
  formId?: string;
  rev?: string;
  effective?: string;
  rightLabel?: string;
}

interface DocBandFooterProps {
  variant: 'footer';
  page?: string;
  text?: string;
}

export type DocBandProps = DocBandTopProps | DocBandFooterProps;

export function DocBand(props: DocBandProps) {
  const { docBand, typography, spacing } = useTheme();

  if (props.variant === 'top') {
    const left = [props.formId, props.rev, props.effective].filter(Boolean).join(' · ');
    return (
      <View
        style={{
          backgroundColor: docBand.top.background,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs + 2,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <MarqueeText
          text={left}
          duration={11000}
          style={{ ...typography.formNumber, color: docBand.top.foreground }}
        />
        {props.rightLabel ? (
          <Text
            numberOfLines={1}
            style={{ ...typography.formNumber, color: docBand.top.foreground, flexShrink: 0, marginLeft: spacing.sm }}
          >
            {props.rightLabel}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: docBand.footer.background,
        borderTopWidth: 1,
        borderTopColor: docBand.footer.border,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <MarqueeText
        text={props.text ?? ''}
        duration={14000}
        style={{ ...typography.monoSm, color: docBand.footer.foreground }}
      />
      {props.page ? (
        <Text
          numberOfLines={1}
          style={{ ...typography.monoSm, color: docBand.footer.foreground, flexShrink: 0, marginLeft: spacing.sm }}
        >
          {props.page}
        </Text>
      ) : null}
    </View>
  );
}
