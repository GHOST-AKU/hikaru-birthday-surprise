const BASE = import.meta.env.BASE_URL;
export const assetPath = (path: string): string => `${BASE}${path.replace(/^\/+/, '')}`;
