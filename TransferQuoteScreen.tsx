import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {fetchQuote, type Quote, type RequestQuote} from './quoteApi';
import {track, type Track} from './analytics';

type Props = {onContinue: (quoteId: string) => void; requestQuote?: RequestQuote; trackEvent?: Track};

export function TransferQuoteScreen({onContinue, requestQuote = fetchQuote, trackEvent = track}: Props) {
  const [input, setInput] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const latestRequestIdRef = useRef(0);
  const attemptRef = useRef(0);
  const continuedAttemptRef = useRef(0);

  async function getQuote(text: string) {
    // Any new input, even an invalid one, should make pending requests stale.
    const requestId = ++latestRequestIdRef.current;
    const amount = Number(text.trim().replace(',', '.'));
    setHasError(false);
    setQuote(null);

    if (!Number.isFinite(amount) || amount <= 0) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const attempt = ++attemptRef.current;
    trackEvent('quote_requested', {attempt});
    
    try {
      const nextQuote = await requestQuote(amount);
      if (requestId === latestRequestIdRef.current) {
        setQuote(nextQuote);
        trackEvent('quote_shown', {attempt});
      }
    } catch {
      if (requestId === latestRequestIdRef.current) {
        setHasError(true);
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  }

  function handleContinue() {
    if (!quote || loading) {
       return;
    }

    // A visible quote always belongs to the latest attempt. Repeated taps are reported once.
    if (continuedAttemptRef.current !== attemptRef.current) {
      continuedAttemptRef.current = attemptRef.current;
      trackEvent('quote_continued', {attempt: attemptRef.current});
    }
    
    onContinue(quote.id);
  }


  useEffect(() => {
    // Pending requests become stale on unmount, so they can't report a quote nobody saw.
    return () => { 
      latestRequestIdRef.current++; 
    };
  }, []);

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
        onPress={handleContinue}>
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
