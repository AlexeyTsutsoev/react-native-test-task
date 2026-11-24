export type Track = (event: string, properties?: Readonly<Record<string, string | number | boolean>>) => void;

// Test double / SDK boundary. No data is sent anywhere.
export const track: Track = (_event, _properties) => {};
