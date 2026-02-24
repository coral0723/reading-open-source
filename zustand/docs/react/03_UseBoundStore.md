# UseBoundStore 타입 분석

## 1. 이 코드의 역할
`UseBoundStore`는 vanilla.ts의 Store API와 
React 컴포넌트에서 상태를 구독하기 위한 Hook 기능을 하나로 합친 타입이다.  

## 2. 구현에서 눈에 띄는 점
### ① 함수이면서 동시에 객체인 인터페이스
```
export type UseBoundStore<S extends ReadonlyStoreApi<unknown>> = {
  (): ExtractState<S>
  <U>(selector: (state: ExtractState<S>) => U): U
} & S
```
**설명**
처음 이 코드를 봤을 때는 `{}` 안에 바로 `()`가 나오는 구조가 낯설었다.  
보통 함수 타입은 `() => T` 형식을 쓰기 때문이다.  

찾아보니 이 방식은 **객체 리터럴 방식**으로,   
**"이 타입은 호출 가능한 함수이면서 동시에 특정 속성을 가진 객체"** 임을 정의할 때 사용한다.  

- `( (): T )`: 이 객체는 이름 없이 호출했을 때 `T`를 반환하는 함수 역할을 한다.
- `& S`: 여기에 Store의 API(getState, subscribe 등)를 교차 타입으로 합친다.  

결과적으로 `useStore()`라고 호출할 수도 있고,  
`useStore.getState()`라고 속성에 접근할 수도 있는 타입이 된다.  

## 3. 왜 이렇게 설계했을까?
zustand는 사용법을 극도로 단순화하고 싶었던 것 같다.  

만약 내가 알던 함수 타입 방식인 `type UseStore = () => State`라고만 정의했다면,  
상태를 가져오는 훅과 Store의 API를 관리하는 객체를 따로 분리해서 제공해야 했을 것이다.  

하지만 `{ 호출 시그니처 } & S` 구조를 사용함으로써,  
사용자는 하나의 변수(useStore)만 가지고 Hook과 API를 넘나들며 사용할 수 있게 된다.  

여기서 내부 구현의 복잡함을 타입 시스템으로 먼저 감싸서 사용자에게 편리함을 제공하려는 의도가 느껴졌다.  

## 4. 내가 만약 직접 만들었다면?
위에서 말했듯, 나는 아마 함수 타입과 객체 타입을 분리해서 생각했을 것 같다.  
```
interface UseBoundStore {
  hook: (selector: ...) => U;
  api: StoreApi<T>;
}
```
이런 식으로 `useStore.hook()`이나 `useStore.api.getState()`처럼 명확히 구분된 구조를 만들었을 것이다.  
하지만 zustand의 방식은 JS의 "함수도 객체다"라는 특성을 영리하게 활용하여 사용자에게 편리함을 제공했다.

## 5. 이 코드에서 배운 점
- `{ (): T}` 문법을 통해 함수 오버로딩과 객체 속성을 한 번에 정의하는 법을 배웠다.  
- 복잡한 내부 타입 설계를 통해 사용자 경험을 상승시킬 수 있음을 다시 한 번 깨달았다.