import { limitNoticeOf } from '../limit-notice';
import type { SearchSelectLimitNoticeProps } from '../search-select.types';

function SearchSelectLimitNotice({ reachedLimit }: SearchSelectLimitNoticeProps) {
  const notice = limitNoticeOf(reachedLimit);
  if (!notice) return null;
  return <p className="m-1 mb-0 rounded-md bg-muted px-2.5 py-2">{notice}</p>;
}

export { SearchSelectLimitNotice };
