import React from 'react';
import { Text, View } from 'react-native';
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
        <Text style={{ ...typography.formNumber, color: docBand.top.foreground }}>{left}</Text>
        {props.rightLabel ? (
          <Text style={{ ...typography.formNumber, color: docBand.top.foreground }}>
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
      <Text style={{ ...typography.monoSm, color: docBand.footer.foreground, flex: 1 }}>
        {props.text ?? ''}
      </Text>
      {props.page ? (
        <Text style={{ ...typography.monoSm, color: docBand.footer.foreground }}>{props.page}</Text>
      ) : null}
    </View>
  );
}
