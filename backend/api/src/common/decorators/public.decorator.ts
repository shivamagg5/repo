// Re-export @Public() and its metadata key from permissions.decorator
// to maintain a single source of truth.
export { Public, PUBLIC_KEY as IS_PUBLIC_KEY } from './permissions.decorator';
