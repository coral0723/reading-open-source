# useStore 분석

## 1. 이 코드의 역할
`useStore`는 **zustand의 store와 React 컴포넌트를 연결**하는 hook이다.  
- 외부 상태(api) 구독
- 상태 변경 시 컴포넌트 리렌더링
- selector를 통해 필요한 state 조각만 추출
- SSR 환경까지 안전하게 지원

## 2. 구현에서 눈에 띄는 점
### ① selector 기본값과 identity as any
```
selector: (state: TState) => StateSlice = identity as any
```
**설명**
- `identity`는 `(x) => x` 함수
- selector를 전달하지 않으면 **전체 상태를 반환**
- `as any`는 타입 안전성 우회를 위한 장치로, selector 타입과 identity 제네릭이 바로 맞지 않기 때문


### ② React.useSyncExternalStore 활용
```
const slice = React.useSyncExternalStore(
  api.subscribe,
  React.useCallback(() => selector(api.getState()), [api, selector]),
  React.useCallback(() => selector(api.getInitialState()), [api, selector])
)
```
**설명**
이 코드는 외부 스토어를 구독하고 snapshot을 관리하며 SSR 안전을 보장한다.  
React 18부터 Concurrent Rendering이 도입되면서,  
기존의 `useEffect + subscribe` 패턴이 안전하지 않게 되어 도입되었다.  

```
useSyncExternalStore(
  subscribe,
  getSnapshot,
  getServerSnapshot?
)
```
- **반환값:** `getSnapshot()` 실행 결과 → selector로 잘린 state 조각(slice)
- **subscribe:** `(listener: () => void) => () => void` 형태이며 상태 변경 시 React에게 알림
- **getSnapshot:** 현재 클라이언트 상태 반환
- **getServerSnapshot:** SSR 대비 초기 상태 반환

`getSnapshot`과 `getServerSnapthot`에서 useCallback을 사용한 이유는   
getSnapshot 함수 참조를 안정적으로 고정해 불필요한 재실행을 방지하기 위함이다.  
처음 보는 React의 hook이라 눈에 띄었다.


## 3. 왜 이렇게 설계했을까?
zustand의 `useStore`는 두 가지 사용법을 제공한다.  
```
useStore(api)
useStore(api, selector)
```
selector의 여부에 따라 전체 state나 state 조각(slice)를 반환해야 하기에  
함수 오버로드 방식을 사용했을 것으로 예상된다.  

## 4. 내가 만약 직접 만들었다면?
React의 `useSyncExternalStore` 존재와 나오게 된 배경을 알지 못하고   
`useEffect + 구독 패턴`을 사용해 Concurrent 환경에서 tearing 문제가 발생했을 것이다.  

## 5. 이 코드에서 배운 점
- React 18의 useSyncExternalStore 구조와 활용법
- selector 기본값과 타입 우회(identity as any) 전략