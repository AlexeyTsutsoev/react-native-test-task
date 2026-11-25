import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react-native';
import {TransferQuoteScreen} from './TransferQuoteScreen';
import type {Quote} from './quoteApi';

const requested = (attempt: number) => ['quote_requested', {attempt}];
const shown = (attempt: number) => ['quote_shown', {attempt}];
const continued = (attempt: number) => ['quote_continued', {attempt}];

function setup() {
  const requests: {amount: number; resolve: (quote: Quote) => void; reject: (error: Error) => void}[] = [];
  const requestQuote = (amount: number) => new Promise<Quote>((resolve, reject) => {
    requests.push({amount, resolve, reject});
  });
  const trackEvent = jest.fn();
  const onContinue = jest.fn();
  const element = () => (
    <TransferQuoteScreen requestQuote={requestQuote} trackEvent={trackEvent} onContinue={onContinue} />
  );
  const {rerender, unmount} = render(element());

  return {
    trackEvent,
    onContinue,
    unmount,
    rerender: () => rerender(element()),
    type: (text: string) => fireEvent.changeText(screen.getByLabelText('Amount in EUR'), text),
    press: (name: string) => fireEvent.press(screen.getByRole('button', {name})),
    // Requests are indexed in the order they were sent.
    succeed: (index: number) => act(async () => {
      const {amount, resolve} = requests[index];
      resolve({id: `q-${amount}`, amount, rate: 89, fee: 2});
    }),
    fail: (index: number) => act(async () => { requests[index].reject(new Error('Offline')); }),
  };
}

it('reports request, quote and continue in order, with nothing but the attempt number', async () => {
  const {type, succeed, press, trackEvent} = setup();
  type('100');
  expect(trackEvent.mock.calls).toEqual([requested(1)]);
  await succeed(0);
  expect(trackEvent.mock.calls).toEqual([requested(1), shown(1)]);
  press('Continue');
  expect(trackEvent.mock.calls).toEqual([requested(1), shown(1), continued(1)]);
});

it('does not repeat events on rerender or repeated Continue taps', async () => {
  const {type, succeed, press, rerender, trackEvent, onContinue} = setup();
  type('100');
  await succeed(0);
  rerender();
  press('Continue');
  press('Continue');
  expect(trackEvent.mock.calls).toEqual([requested(1), shown(1), continued(1)]);
  expect(onContinue).toHaveBeenCalledTimes(2);
});

it('does not report a stale quote as shown', async () => {
  const {type, succeed, trackEvent} = setup();
  type('100');
  type('200');
  await succeed(1);
  await succeed(0);
  expect(trackEvent.mock.calls).toEqual([requested(1), requested(2), shown(2)]);
});

it('counts a retry as a new attempt', async () => {
  const {type, fail, succeed, press, trackEvent} = setup();
  type('100');
  await fail(0);
  expect(trackEvent.mock.calls).toEqual([requested(1)]);
  press('Retry');
  await succeed(1);
  expect(trackEvent.mock.calls).toEqual([requested(1), requested(2), shown(2)]);
});

it('leaves the last attempt without a quote when only an intermediate one was shown', async () => {
  const {type, succeed, fail, trackEvent} = setup();
  type('1');
  await succeed(0);
  type('10');
  await fail(1);
  expect(trackEvent.mock.calls).toEqual([requested(1), shown(1), requested(2)]);
});

it('reports nothing for invalid input and does not number it as an attempt', async () => {
  const {type, succeed, press, trackEvent} = setup();
  type('');
  type('abc');
  type('0');
  press('Continue');
  expect(trackEvent).not.toHaveBeenCalled();
  type('100');
  type('');
  await succeed(0);
  type('200');
  expect(trackEvent.mock.calls).toEqual([requested(1), requested(2)]);
});

it('does not report a quote that arrives after the screen is closed', async () => {
  const {type, succeed, unmount, trackEvent} = setup();
  type('100');
  unmount();
  await succeed(0);
  expect(trackEvent.mock.calls).toEqual([requested(1)]);
});

it('reports Continue again for a new attempt', async () => {
  const {type, succeed, press, trackEvent} = setup();
  type('100');
  await succeed(0);
  press('Continue');
  type('200');
  await succeed(1);
  press('Continue');
  expect(trackEvent.mock.calls).toEqual([
    requested(1), shown(1), continued(1),
    requested(2), shown(2), continued(2),
  ]);
});
