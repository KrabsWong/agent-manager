import { defaultUrlTransform } from 'react-markdown';

const LOCAL_IMAGE_DATA_URL =
  /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml|bmp|x-icon|avif);base64,/i;

export function markdownUrlTransform(value: string): string {
  if (LOCAL_IMAGE_DATA_URL.test(value)) {
    return value;
  }

  return defaultUrlTransform(value);
}
