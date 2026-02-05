# CreateStore 타입 분석

## 1. 이 코드의 역할
`CreateStore`는 `StateCreator`라는 **store 설계도**를 받아  
muatator 조합이 반영된 최종 `StoreApi` 타입을 산출하는 **store 생성 함수의 타입**이다.  

`StateCreator`가  
> "이 store는 어떤 상태 구조(`T`)를 가지며, 어떤 mutator 조합(`Mos`)을 전제로 만들어졌는가?"

를 설명하는 타입이라면,  

`CreateStore`는 그 정보를 바탕으로  
> "그래서 최종적으로 어떤 형태의 store API가 만들어지는가?"  

를 결정하는 역할을 맡는다.  

## 2. 구현에서 눈에 띄는 점
### ① 함수 타입이 아닌 호출 가능한 객체 타입 
```
type CreateStore = {
  <T, Mos extends ...>(initializer: ...): ...
  <T>(): <Mos extends ...>(initializer: ...) => ...
}
```
**설명**  
처음 코드를 봤을 때는 `CreateStore`가 단순한 함수 타입처럼 보였지만,  
실제로는 **객체 타입 안에 여러 개의 호출 시그니처를 정의한 구조**다.  

이 객체는 값으로는 하나의 함수지만,  
타입 레벨에서는 **서로 다른 두 가지 호출 방식**을 동시에 표현한 점이 눈에 띄었다.  

### ② 오버로드된 호출 시그니처
`CreateStore`에는 두 개의 호출 시그니처가 존재한다.  

**1. 직접 호출 시그니처**
```
<T, Mos extends ...>(
  initializer: StateCreator<T, [], Mos>
): Mutate<StoreApi<T>, Mos>
```
- `T`와 `Mos`를 **한 번에 결정**  
- `initializer`를 바로 받아 최종 store 타입을 반환  

**2. 커리드 호출 시그니처**
```
<T>(): <Mos extends ...>(
  initializer: StateCreator<T, [], Mos>
) => Mutate<StoreApi<T>, Mos>
```
- 1단계: `T`만 먼저 확정
- 2단계: `initializer`를 통해 `Mos`를 추론  

**설명**  
이 두 번째 호출 시그니처 덕분에 사용자는 아래와 같은 패턴으로 store를 생성할 수 있다.  
```
const create = createStore<MyState>()

create(
  devtools(
    persist((set, get) => ({ ... }))
  )
)
```
- `MyState`는 명시
- mutator 조합(`Mos`)은 **initializer로부터 자동 추론**  

이 구조가 없었다면 사용자는 매번 아래처럼 직접 `Mos`를 적어야 했다.  
```
createStore<MyState, [
  ['zustand/devtools', ...],
  ['zustand/persist', ...]
]>(initializer)
```
실사용 관점에서는 상당히 불편한 API가 된다.  

여기서 궁금증이 들었다.  
> "사용자 입장에서는 두 번째 호출 시그니처만 있으면 충분한데,  
> 첫 번재 호출 시그니처는 왜 존재하지?"  

그 이유는 첫 번째 호출 시그니처는 사용자 편의용이 아니라,  
**타입 시스템을 위한 기준점**이다.

TypeScript에서 **커리드 호출 시그니처만 있는 타입**은    
제네릭 추론이 불안정해지거나 구현 함수의 타입을 만족시키기 어려워지는 문제가 있다.  

런타임에서 `createStore`의 실제 구현은 개념적으로 다음과 같은 형태다.  
```
function createStore(initializer) {
  ...
}
```
이 함수는 다음 두 호출을 모두 지원해야 한다.  
- `createStore(initializer)`
- `createStore<T>()(initializer)`

이때 **직접 호출 시그니처**는 
`StateCreator<T, Mos>` → `Mutate<StoreApi<T>, Mos>`라는 핵심 변환 규칙을  
타입 시스템에 **명시적으로 고정**해준다.  

이 시그니처가 존재하기 때문에  
커리드 호출의 반환 함수 타입도 안정적으로 계산되고 `Mos` 추론 컨텍스트가 끊기지 않는다.  

즉, 첫 번째 호출 시그니처는 타입 변환의 기준점임을 TypeScript에 알려주는 역할을 하는 것이다.  

## 3. 왜 이렇게 설계했을까?
핵심 이유는 타입 추론의 부담을 단계별로 분리하기 위해서라고 볼 수 있다.  
- 사용자에게는 → 커리드 호출로 편한 API 제공  
- 타입 시스템에는 → 직접 호출 시그니처로 명확한 기준점 제공  

이 두 요구를 동시에 만족시키기 위해 오버로드 구조가 선택된 것으로 보인다.

## 4. 내가 만약 직접 만들었다면?
아마 처음에는 이렇게 만들었을 것 같다.  
```
type CreateStore = <T>(initializer: StateCreator<T>) => StoreApi<T>
```
그리고 mutator 관련 정보는 옵션 객체나 별도의 설정 단계로 분리했을 것이다.  

하지만 그렇게 하면 `T`와 `Mos` 결정 시점을 분리하기 어려웠을 것 같다.  

## 5. 이 코드에서 배운 점
- `<T>() => <U>() => R` 형태는 타입 추론 시점을 분리하기 위한 설계 패턴이다.
- 라이브러리 타입 설계에서는 “사용자를 위한 API”와 “타입 시스템을 위한 기준점”이 서로 다른 호출 시그니처로 공존할 수 있다
- 타입 시스템을 안정시키기 위한 기준점 역할을 하는 호출 시그니처를 사용하는 법