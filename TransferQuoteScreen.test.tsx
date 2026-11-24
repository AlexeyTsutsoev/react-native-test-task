import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react-native';
import {TransferQuoteScreen} from './TransferQuoteScreen';
import type {Quote} from './quoteApi';

const quote: Quote = {id: 'q-1', amount: 100, rate: 89, fee: 2};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('shows a quote and continues with it', async () => {
  const requestQuote = jest.fn().mockResolvedValue(quote);
  const onContinue = jest.fn();
  render(<TransferQuoteScreen requestQuote={requestQuote} onContinue={onContinue} />);
  await act(async () => { fireEvent.changeText(screen.getByLabelText('Amount in EUR'), '100'); });
  expect(screen.getByText('Rate: 89 INR/EUR')).toBeTruthy();
  expect(screen.getByText('Fee: 2 EUR')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', {name: 'Continue'}));
  expect(onContinue).toHaveBeenCalledWith('q-1');
});

it('shows a retry option after a quote error', async () => {
  const requestQuote = jest.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(quote);
  render(<TransferQuoteScreen requestQuote={requestQuote} onContinue={jest.fn()} />);
  await act(async () => { fireEvent.changeText(screen.getByLabelText('Amount in EUR'), '100'); });
  expect(screen.getByRole('alert')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByRole('button', {name: 'Retry'})); });
  expect(requestQuote.mock.calls).toEqual([[100], [100]]);
  expect(screen.getByText('Rate: 89 INR/EUR')).toBeTruthy();
});
