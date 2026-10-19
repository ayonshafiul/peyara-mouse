// Metro resolves platform-specific modules automatically: builds pick
// TouchpadScreen.ios.tsx / TouchpadScreen.android.tsx and this file is
// never bundled. It exists only so TypeScript (which does not resolve
// platform suffixes) can resolve imports of '../screens/TouchpadScreen'.
export {default} from './TouchpadScreen.ios';
