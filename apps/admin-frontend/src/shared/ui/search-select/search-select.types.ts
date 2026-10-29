import type { Ref } from 'react';

interface SearchSelectItem {
  id: string;
  name: string;
  color?: string | undefined;
}

interface SearchSelectFailure {
  detail: string | undefined;
  onRetry: () => void;
}

interface SearchSelectMore {
  total: number;
  pending: boolean;
  onLoadMore: () => void;
}

interface SearchSelectBaseProps<T extends SearchSelectItem> {
  items: readonly T[];
  placeholder?: string | undefined;
  emptyMessage?: string | undefined;
  errorMessage?: string | undefined;
  loading?: boolean | undefined;
  failure?: SearchSelectFailure | undefined;
  more?: SearchSelectMore | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  onSearchChange?: ((search: string) => void) | undefined;
  disabled?: boolean | undefined;
  inputRef?: Ref<HTMLInputElement> | undefined;
  onBlur?: (() => void) | undefined;
  id?: string | undefined;
  'aria-invalid'?: boolean | undefined;
  'aria-describedby'?: string | undefined;
  className?: string | undefined;
}

interface SearchSelectSingleProps<T extends SearchSelectItem> extends SearchSelectBaseProps<T> {
  multiple?: false | undefined;
  value: T | null;
  onValueChange: (value: T | null) => void;
  maxSelected?: never;
}

interface SearchSelectMultipleProps<T extends SearchSelectItem> extends SearchSelectBaseProps<T> {
  multiple: true;
  value: T[];
  onValueChange: (value: T[]) => void;
  maxSelected?: number | undefined;
}

type SearchSelectProps<T extends SearchSelectItem> =
  SearchSelectSingleProps<T> | SearchSelectMultipleProps<T>;

type SearchSelectSourceProps =
  'items' | 'loading' | 'failure' | 'more' | 'onOpenChange' | 'onSearchChange';

export type {
  SearchSelectFailure,
  SearchSelectItem,
  SearchSelectMore,
  SearchSelectMultipleProps,
  SearchSelectProps,
  SearchSelectSingleProps,
  SearchSelectSourceProps,
};
