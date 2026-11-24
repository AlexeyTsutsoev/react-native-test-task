import React, {useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {fetchQuote, type Quote, type RequestQuote} from './quoteApi';
import {track, type Track} from './analytics';

type Props = {onContinue: (quoteId: string) => void; requestQuote?: RequestQuote; trackEvent?: Track};

export function TransferQuoteScreen({onContinue, requestQuote = fetchQuote, trackEvent = track}: Props) {
  const [input, setInput] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function getQuote(text: string) {
    const amount = Number(text.trim().replace(',', '.'));
    setHasError(false);
    if (!Number.isFinite(amount) || amount <= 0) {
      setQuote(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setQuote(await requestQuote(amount));
    } catch {
      setQuote(null);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }

  const canContinue = Boolean(quote) && !loading;

  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>Transfer EUR → INR</Text>

      <View style={styles.card}>
        <Text style={styles.label}>You send</Text>
        <View style={styles.amountRow}>
          <TextInput
            accessibilityLabel="Amount in EUR"
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.muted}
            style={styles.amount}
            value={input}
            onChangeText={text => { setInput(text); void getQuote(text); }}
          />
          <Text style={styles.currency}>EUR</Text>
        </View>
      </View>

      {loading && <ActivityIndicator accessibilityLabel="Loading quote" color={colors.primary} />}
      {hasError && (
        <View style={[styles.card, styles.errorCard]}>
          <Text accessibilityRole="alert" style={styles.errorText}>Could not load quote</Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => void getQuote(input)}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      )}
      {quote && (
        <View style={styles.card}>
          <Text style={styles.quoteLine}>Rate: {quote.rate} INR/EUR</Text>
          <Text style={styles.quoteLine}>Fee: {quote.fee} EUR</Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={!canContinue}
        style={({pressed}) => [styles.button, !canContinue && styles.buttonDisabled, pressed && styles.buttonPressed]}
        onPress={() => {
          if (quote && !loading) onContinue(quote.id);
        }}>
        <Text style={[styles.buttonText, !canContinue && styles.buttonTextDisabled]}>Continue</Text>
      </Pressable>
    </View>
  );
}

const colors = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  border: '#E3E6EB',
  text: '#10151C',
  muted: '#8A93A1',
  primary: '#1F5EFF',
  danger: '#B42318',
  dangerSurface: '#FEF3F2',
  dangerBorder: '#FDA29B',
};

const styles = StyleSheet.create({
  screen: {flex: 1, padding: 20, gap: 16, backgroundColor: colors.background},
  title: {fontSize: 24, fontWeight: '700', color: colors.text},
  card: {
    padding: 16,
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  label: {fontSize: 13, fontWeight: '500', color: colors.muted},
  amountRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  amount: {flex: 1, padding: 0, fontSize: 32, fontWeight: '600', color: colors.text},
  currency: {fontSize: 16, fontWeight: '600', color: colors.muted},
  quoteLine: {fontSize: 16, color: colors.text},
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerSurface,
  },
  errorText: {fontSize: 15, color: colors.danger},
  retry: {fontSize: 15, fontWeight: '600', color: colors.primary},
  button: {alignItems: 'center', paddingVertical: 16, borderRadius: 14, backgroundColor: colors.primary},
  buttonDisabled: {backgroundColor: colors.border},
  buttonPressed: {opacity: 0.85},
  buttonText: {fontSize: 17, fontWeight: '600', color: '#FFFFFF'},
  buttonTextDisabled: {color: colors.muted},
});
