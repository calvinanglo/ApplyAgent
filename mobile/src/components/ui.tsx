/**
 * UI primitives — themed RN components mirroring the web's shadcn/ui set.
 *
 * Components: Card, Button, Input, Badge, Separator, Spinner, Screen, Text-h*
 *
 * Each component reads colors from useTheme() so it automatically swaps
 * between light and dark mode.
 */

import { type ReactNode } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView,
  StyleSheet, type ViewStyle, type TextStyle, type TextInputProps,
  type TouchableOpacityProps, type ScrollViewProps,
} from 'react-native'
import { useTheme } from '../lib/theme'

// ── Screen ────────────────────────────────────────────────────────────
// Themed screen wrapper. Use as the root of every screen.
export function Screen({
  children, style, scroll = false, ...rest
}: { children: ReactNode; style?: ViewStyle; scroll?: boolean } & ScrollViewProps) {
  const { theme } = useTheme()
  const containerStyle: ViewStyle = { flex: 1, backgroundColor: theme.background }
  if (scroll) {
    return (
      <ScrollView
        style={containerStyle}
        contentContainerStyle={[{ padding: 20, paddingBottom: 40 }, style]}
        keyboardShouldPersistTaps="handled"
        {...rest}
      >
        {children}
      </ScrollView>
    )
  }
  return <View style={[containerStyle, style]}>{children}</View>
}

// ── Card ──────────────────────────────────────────────────────────────
export function Card({ children, style, padded = true }: { children: ReactNode; style?: ViewStyle; padded?: boolean }) {
  const { theme } = useTheme()
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.border,
          padding: padded ? 16 : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

// ── Button ────────────────────────────────────────────────────────────
type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
type ButtonSize = 'default' | 'sm' | 'lg'

export function Button({
  children, variant = 'default', size = 'default', loading, fullWidth = true, leftIcon, rightIcon, style, disabled, ...rest
}: {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  style?: ViewStyle
} & TouchableOpacityProps) {
  const { theme } = useTheme()
  const isDisabled = disabled || loading

  const sizing = {
    sm: { paddingVertical: 8, paddingHorizontal: 12, fontSize: 13 },
    default: { paddingVertical: 14, paddingHorizontal: 16, fontSize: 15 },
    lg: { paddingVertical: 16, paddingHorizontal: 20, fontSize: 16 },
  }[size]

  const variantStyle = {
    default: { bg: theme.primary, fg: theme.primaryForeground, border: 'transparent' },
    secondary: { bg: theme.secondary, fg: theme.secondaryForeground, border: 'transparent' },
    outline: { bg: 'transparent', fg: theme.foreground, border: theme.border },
    ghost: { bg: 'transparent', fg: theme.foreground, border: 'transparent' },
    destructive: { bg: theme.destructive, fg: theme.destructiveForeground, border: 'transparent' },
  }[variant]

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={isDisabled}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: sizing.paddingVertical,
          paddingHorizontal: sizing.paddingHorizontal,
          borderRadius: 8,
          backgroundColor: variantStyle.bg,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: variantStyle.border,
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'auto' : 'flex-start',
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.fg} size="small" />
      ) : (
        <>
          {leftIcon}
          <Text style={{ color: variantStyle.fg, fontSize: sizing.fontSize, fontWeight: '600' }}>
            {children}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  )
}

// ── Input ─────────────────────────────────────────────────────────────
export function Input({
  leftIcon, rightIcon, style, ...rest
}: { leftIcon?: ReactNode; rightIcon?: ReactNode; style?: ViewStyle } & TextInputProps) {
  const { theme } = useTheme()
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.input,
          borderRadius: 8,
          backgroundColor: theme.background,
        },
        style,
      ]}
    >
      {leftIcon ? <View style={{ paddingLeft: 12 }}>{leftIcon}</View> : null}
      <TextInput
        placeholderTextColor={theme.mutedForeground}
        style={{
          flex: 1,
          paddingVertical: 12,
          paddingHorizontal: leftIcon ? 8 : 12,
          fontSize: 15,
          color: theme.foreground,
        }}
        {...rest}
      />
      {rightIcon ? <View style={{ paddingRight: 12 }}>{rightIcon}</View> : null}
    </View>
  )
}

// Multi-line variant
export function Textarea(props: TextInputProps & { rows?: number; style?: ViewStyle }) {
  const { theme } = useTheme()
  const minHeight = (props.rows ?? 6) * 22
  return (
    <TextInput
      {...props}
      multiline
      textAlignVertical="top"
      placeholderTextColor={theme.mutedForeground}
      style={[
        {
          borderWidth: 1,
          borderColor: theme.input,
          borderRadius: 8,
          backgroundColor: theme.background,
          padding: 12,
          fontSize: 14,
          color: theme.foreground,
          minHeight,
        },
        props.style as ViewStyle,
      ]}
    />
  )
}

// ── Badge ─────────────────────────────────────────────────────────────
type BadgeTone = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'
export function Badge({ children, tone = 'default', style }: { children: ReactNode; tone?: BadgeTone; style?: ViewStyle }) {
  const { theme } = useTheme()
  const tones = {
    default: { bg: theme.primary, fg: theme.primaryForeground, border: 'transparent' },
    secondary: { bg: theme.secondary, fg: theme.secondaryForeground, border: 'transparent' },
    success: { bg: theme.success, fg: '#ffffff', border: 'transparent' },
    warning: { bg: theme.warning, fg: '#ffffff', border: 'transparent' },
    destructive: { bg: theme.destructive, fg: theme.destructiveForeground, border: 'transparent' },
    outline: { bg: 'transparent', fg: theme.foreground, border: theme.border },
  }[tone]

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 6,
          backgroundColor: tones.bg,
          borderWidth: tone === 'outline' ? 1 : 0,
          borderColor: tones.border,
        },
        style,
      ]}
    >
      <Text style={{ color: tones.fg, fontSize: 11, fontWeight: '600' }}>{children}</Text>
    </View>
  )
}

// ── Separator ─────────────────────────────────────────────────────────
export function Separator({ style }: { style?: ViewStyle }) {
  const { theme } = useTheme()
  return <View style={[{ height: 1, backgroundColor: theme.border, width: '100%' }, style]} />
}

// ── Spinner ───────────────────────────────────────────────────────────
export function Spinner({ size = 'large', color }: { size?: 'small' | 'large'; color?: string }) {
  const { theme } = useTheme()
  return <ActivityIndicator size={size} color={color || theme.foreground} />
}

// Centered spinner — use for full-screen loading states.
export function CenteredSpinner() {
  const { theme } = useTheme()
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
      <Spinner />
    </View>
  )
}

// ── Typography ────────────────────────────────────────────────────────
export function H1({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const { theme } = useTheme()
  return <Text style={[{ fontSize: 24, fontWeight: '700', color: theme.foreground }, style]}>{children}</Text>
}
export function H2({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const { theme } = useTheme()
  return <Text style={[{ fontSize: 20, fontWeight: '700', color: theme.foreground }, style]}>{children}</Text>
}
export function H3({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const { theme } = useTheme()
  return <Text style={[{ fontSize: 16, fontWeight: '600', color: theme.foreground }, style]}>{children}</Text>
}
export function P({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: TextStyle }) {
  const { theme } = useTheme()
  return (
    <Text style={[{ fontSize: 14, lineHeight: 20, color: muted ? theme.mutedForeground : theme.foreground }, style]}>
      {children}
    </Text>
  )
}
export function Caption({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const { theme } = useTheme()
  return <Text style={[{ fontSize: 11, color: theme.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' }, style]}>{children}</Text>
}

// ── Empty state ───────────────────────────────────────────────────────
export function EmptyState({ title, description, icon, action }: { title: string; description?: string; icon?: ReactNode; action?: ReactNode }) {
  const { theme } = useTheme()
  return (
    <View style={{ padding: 40, alignItems: 'center' }}>
      {icon}
      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.foreground, marginTop: 12, textAlign: 'center' }}>{title}</Text>
      {description ? (
        <Text style={{ fontSize: 13, color: theme.mutedForeground, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </View>
  )
}

// Re-export for convenience
export const styles = StyleSheet.create({})
