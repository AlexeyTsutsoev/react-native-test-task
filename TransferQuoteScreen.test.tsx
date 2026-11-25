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

it('ignores an older quote that arrives after the current one', async () => {
  const resolvers = new Map<number, (quote: Quote) => void>();
  const requestQuote = (amount: number) => new Promise<Quote>(resolve => { resolvers.set(amount, resolve); });
  const onContinue = jest.fn();
  render(<TransferQuoteScreen requestQuote={requestQuote} onContinue={onContinue} />);
  fireEvent.changeText(screen.getByLabelText('Amount in EUR'), '100');
  fireEvent.changeText(screen.getByLabelText('Amount in EUR'), '200');

  await act(async () => { resolvers.get(200)!({id: 'q-200', amount: 200, rate: 90, fee: 3}); });
  await act(async () => { resolvers.get(100)!({id: 'q-100', amount: 100, rate: 89, fee: 2}); });

  expect(screen.getByText('Rate: 90 INR/EUR')).toBeTruthy();
  expect(screen.queryByText('Rate: 89 INR/EUR')).toBeNull();
  fireEvent.press(screen.getByRole('button', {name: 'Continue'}));
  expect(onContinue.mock.calls).toEqual([['q-200']]);
});

it('keeps only the last of many quotes that arrive out of order', async () => {
  const requests = new Map<number, {resolve: (quote: Quote) => void; reject: (error: Error) => void}>();
  const requestQuote = (amount: number) => new Promise<Quote>((resolve, reject) => {
    requests.set(amount, {resolve, reject});
  });
  const succeed = (amount: number) => act(async () => {
    requests.get(amount)!.resolve({id: `q-${amount}`, amount, rate: amount, fee: 2});
  });
  const fail = (amount: number) => act(async () => { requests.get(amount)!.reject(new Error('Offline')); });
  const type = (amount: number) => fireEvent.changeText(screen.getByLabelText('Amount in EUR'), String(amount));
  const pressContinue = () => fireEvent.press(screen.getByRole('button', {name: 'Continue'}));
  const expectLoading = () => {
    expect(screen.queryByText(/^Rate:/)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText('Loading quote')).toBeTruthy();
    pressContinue();
    expect(onContinue).not.toHaveBeenCalled();
  };
  const onContinue = jest.fn();
  render(<TransferQuoteScreen requestQuote={requestQuote} onContinue={onContinue} />);

  // A quote is already on screen; new input hides it right away.
  type(100);
  await succeed(100);
  expect(screen.getByText('Rate: 100 INR/EUR')).toBeTruthy();
  for (const amount of [200, 300, 400, 500, 600]) type(amount);
  expectLoading();

  // Stale answers and errors before the current one change nothing.
  await succeed(300);
  expectLoading();
  await fail(500);
  expectLoading();

  // Nor do they after it.
  await succeed(600);
  await succeed(200);
  await fail(400);
  expect(screen.getByText('Rate: 600 INR/EUR')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
  pressContinue();
  expect(onContinue.mock.calls).toEqual([['q-600']]);
});
