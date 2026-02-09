import type { ChangeEvent, FormEvent } from 'react';
import { useMemosStore } from '../store/memos';

export default function Form() {
  const { memo, setMemo, setMemos } = useMemosStore();

  const handleWriteMemo = (e: ChangeEvent<HTMLInputElement>) => {
    setMemo(e.target.value);
  };

  const handleAddMemo = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMemos(memo);
    setMemo('');
  };

  return (
    <>
      <form onSubmit={handleAddMemo}>
        <input type='text' onChange={handleWriteMemo} value={memo} />
        <button type='submit'>작성완료</button>
      </form>
    </>
  );
};