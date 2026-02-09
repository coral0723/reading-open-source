# CreateStoreImpl 분석

## 1. 이 코드의 역할
`CreateStoreImpl`은 `StateCreator`를 실제로 실행해 **초기 state를 생성하고,**  
그 state를 중심으로 한 `setState / getState / initialState / subscribe` 로직을  
**하나의 StoreApi 객체로 조립하는 구현 함수**다.  

`CreateStore` 타입이  
> "이 initializer로부터 어떤 store 타입이 만들어지는가?"  

를 정의했다면,  

`CreateStoreImpl`은 그 타입 정의를 바탕으로  
> "그 store는 실제로 어떻게 동작하는가?"  

를 구현하는 단계라고 볼 수 있다.  

즉, zustand에서 **store 인스턴스가 실제로 생성되는 지점**이다.  

## 2. 구현에서 눈에 띄는 점
### ① state를 외부에 노출하지 않는 구조  
```
let state: TState
```
**설명**  
처음엔 state가 단순한 지역 변수로 보였지만,  
실제로는 **store의 모든 상태를 대표하는 단일 원천** 역할을 한다.  
- 외부에서는 `state`에 직접 접근할 수 없음
- 오직 `setState`, `getState`를 통해서만 접근할 수 있음

이는 클래스가 아닌 클로저를 이용해 상태를 캡슐화한 구조라는 점이 인상 깊었다.  

### ② mutation의 단일 진입점: setState  
```
const setState = (partial, replace) => { ... }
```
**설명**  
모든 상태 변경은 반드시 이 함수를 거친다.  

여기서 항상 수행되는 절차는 다음과 같다.  

**(1) `partial`이 함수인지 값인지 판별**
```
const nextState =
  typeof partial === 'function'
    ? (partial as (state: TState) => TState)(state) 
    : partial // 함수가 아니라 값이면 그 자체를 nextState로 사용
```
- 함수라면 현재 `state`를 인자로 넣어서 실행  
- 값이라면 그 자체를 `nextState`로 사용  

이는 `setState`가  
`setState(next)`와 `setState(prev => next)`라는 두 가지 호출 방식을 모두 지원하기 위한 설계다.  

**(2) `Object.is`로 변경 여부 판단**
```
if (!Object.is(nextState, state))
```
`!==` 대신 `object.is`를 사용해  
**조금 더 엄밀한 동일성 비교**로 "진짜로 상태가 바뀌었는가?"를 판단한다.  

이를 통해 실제로 값이 달라졌을 때만  
state를 교체하고 listener를 호출하도록 제한한다.  

**(3) `replace` 여부에 따라 병합 또는 교체**  
```
state = 
  (replace ?? (typeof nextState !== 'object' || nextState === null)) // replace가 명시되거나, nextState가 객체가 아니거나 null이 아닐 때
    ? (nextState as TState) // state에 nextState의 값을 덮어씌우기
    : Object.assign({}, state, nextState) // 아니라면 state와 nextState를 병합
```
- `replace`가 명시되었으면 **무조건 교체**
- 그렇지 않다면
  - `nextState`가 객체가 아니거나 `null`이면 **교체** 
  - 객체라면 **기존 state와 병합**

기본 동작은 안전한 병합을 선택하되,  
필요하다면 사용자가 명시적으로 전체 교체를 선택할 수 있도록 열어둔 구조다.  

**(4) listener에게 `(state, previousState)` 전달**  
```
listeners.forEach((listener) => listener(state, previousState))
```
`listeners` Set에 등록된 함수들을 순회하며  
변경된 `state`와 이전 `previousState`를 함께 전달한다.  

외부에서 봤을 땐 상태 변경이 자유로운 것처럼 보였지만,  
실제로는 **매우 통제된 흐름**을 가진다는 것이 인상 깊었다.  

### ③ 초기 state 생성 시점  
```
const initialState = (state = createState(setState, getState, api))
```
**설명**  
이 줄에서 두 가지 일이 동시에 일어난다.  

(1) `createState(...)` 실행 → **초기 상태 생성**  
(2) 그 값을 `state`와 `initialState`에 동시에 할당  

결론적으로 `state`는 여기서 처음으로 값을 가지게 되고,  
`initialState`는 **초기 시점의 스냅샷**으로 보존된다.  

## 3. 왜 이렇게 설계했을까?
이런 설계는 단순함과 통제력을 동시에 챙기기 위한 선택으로 보인다.  

state는 mutable 변수로 관리하지만,  
변경 경로는 하나로 강제하고 외부에서는 불변처럼 보이게 만든다.  

이 방식은 최소한의 코드로 **예측 가능한 상태 관리**를 가능하게 한다.  

## 4. 내가 만약 직접 만들었다면?
아마 처음엔 클래스를 사용하는 방식을 떠올렸을 것 같다.  
```
class Store<T> {
  private state: T
  setState(...) { ... }
}
```  
아래 분석 글에서 알게된 클래스의 `private` 문법을 활용해 state를 외부에서 숨기려 했을 것이다.  
(참고: https://likeornament.tistory.com/37)  

하지만 이 방식은 mutator 조합이 어려워지고 타입 확장이 복잡해졌을 것 같다.  

## 5. 이 코드에서 배운 점
- “단일 진입점”은 강력한 안정 장치
- mutable state라도 접근 경로를 제한하면 충분히 안전해질 수 있음