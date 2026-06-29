// firebase/auth ships a React-Native-specific build (resolved automatically
// by Metro via the package's "react-native" field) that exports
// `getReactNativePersistence`. TypeScript's `tsc`/IDE resolution, however,
// always resolves the package's default (web) typings, which don't declare
// this function — even though it exists and works at runtime in the app.
// This ambient declaration just satisfies the type checker.
import { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: unknown): Persistence;
}
