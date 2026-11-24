export type Quote = {id: string; amount: number; rate: number; fee: number};
export type RequestQuote = (amount: number) => Promise<Quote>;

// Synthetic data only. Delay depends on amount so the ordering is reproducible.
export const fetchQuote: RequestQuote = amount => new Promise((resolve, reject) => {
  setTimeout(() => {
    if (amount === 13) {
      reject(new Error('Mock outage'));
      return;
    }
    resolve({id: `quote-${amount}`, amount, rate: amount < 200 ? 89 : 90, fee: amount < 200 ? 2 : 3});
  }, amount === 100 ? 500 : 80);
});
