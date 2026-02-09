import { useMemosStore } from '../store/memos';

export default function Memos() {
  const { memos } = useMemosStore();

  return (
    <ul>
      {memos.map((memo) => {
        return <li key='memo'>{memo}</li>;
      })}
    </ul>
  );
};