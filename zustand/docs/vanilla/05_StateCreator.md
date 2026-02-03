# StateCreator 타입 분석

## 1. 이 코드의 역할
`StateCreator`는 zustand에서 **store의 초기 상태와 로직을 정의하는 상태 생성 함수의 타입**이다.

단순히 `() => State` 형태의 함수가 아니다.  

mutator가 적용된 `setState`, `getState`, `store`를 인자로 받아
그 결과로 상태 객체 `U`를 반환하고,  
동시에 어떤 mutator들을 사용할 것인지에 대한 정보인 `Mos`를 함수 자체에 담을 수 있도록 설계되어 있다.  

즉, 이 타입은 다음 두 가지 질문에 동시에 답한다.  
- "이 함수는 **어떤 형태의 store를 만들어내는가?**"
- "이 store는 **어떤 mutator 조합을 전제로 만들어졌는가?**"  

`StateCreator`는 단순한 구현 함수의 타입이 아니라,  
**store 생성 과정 전체를 타입으로 설명하기 위한 중심 인터페이스**라고 볼 수 있다.  

## 2. 구현에서 눈에 띄는 점
### ① 함수 타입과 객체 타입을 교차(&)한 구조
```
((set, get, store) => U) & { $$storeMutators?: Mos }
```
**설명**  
처음 봤을 땐 함수의 반환값 타입이 `U & {...}`로 오해했다.  

하지만 이 표현은 **함수도 객체**인 JavaScript의 특성을 타입으로 그대로 옮긴 구조다.  

이 타입은 아래의 의미들을 동시에 표현한다.  
- `U`를 반환하는 함수
- 추가로 `$$storeMuators`라는 프로퍼티를 가질 수 있는 객체

즉, 반환값이 아니라 **함수 자체**에 메타 정보를 붙이는 방식이다. 

실제로 가능한 JS의 예시는 아래와 같다. 
```
const creator = ((set, get, store) => {
  return { count: 0 }
}) as StateCreator

creator.$$storeMutators = [
  ['zustand/persist', options],
]
```

여기서 중요한 점은 `$$storeMuators`가 **반환값 `U`의 일부가 아니라는 것**이다.  
- `U`: 실제 store의 상태 구조
- `$$storeMutators`: 이 creator가 어떤 mutator 조합을 의도했는지에 대한 **타입 전용 메타데이터**  

이 둘을 섞지 않고,  
함수가 객체라는 특성을 활용해 **함수 자체에 메타 정보를 부여한 설계**라는 점이 인상 깊었다.  

### ② Mis, Mos의 역할 분리  
```
Mis extends [StoreMutatorIdentifier, unknown][]
Mos extends [StoreMutatorIdentifier, unknown][]
```
**설명**  
각각 이름과 사용 위치를 보아 이름의 뜻을 추측할 수 있었다.  
`Mis`는 내부에서만 사용되는 걸로 보아 **Mutators In**의 약자로 추측되고,  
`Mos`는 외부로 빠져나갈 때만 사용되는 걸로 보아 **Mutators Out**의 약자로 추측된다.  

- `Mis` **(Mutators In)**  
  - 이미 적용된 mutator들의 목록
  - `setState`, `getState`, `store`의 타입을 계산하는 데 사용됨
- `Mos` **(Mutators Out)**  
  - 이 `StateCreator`가 새롭게 선언하는 mutator들의 목록
  - `$$storeMutators`를 통해 외부로 노출됨  

입력과 출력을 명확히 분리함으로써,  
mutator 흐름을 **타입 레벨에서 파이프라인처럼 연결**할 수 있도록 만든 구조라는 점이 인상 깊었다.

## 3. 왜 이렇게 설계했을까?
이 설계의 핵심은 
mutator는 실행 결과보다 조합 순서가 중요하다는 전제에 있다고 느껴졌다.  

mutator는 런타임에 실행되지만,  
그 조합 결과는 타입 단계에서 미리 계산된다.  

그리고 그 계산의 출발점이 `StateCreator`다.  

만약 `$$storeMutators`를 반환값에 포함시켰다면  
store의 state 타입이 불필요하게 오염되었을 것이다.  

반대로 함수자체에 메타 정보를 붙이는 방식을 택함으로써  
런타임 동작에는 아무런 영향을 주지 않으면서  
타입 시스템만 이 정보를 읽어 mutator 순서를 안전하게 추적할 수 있다.  

## 4. 내가 만약 직접 만들었다면?
아마 처음에는 아래처럼 만들었을 것 같다.  
```
type StateCreator = (set, get) => State
```
그리고 mutator 정보는 별도의 설정 객체나 옵션으로 분리했을 가능성이 크다.  

하지만 그렇게 되면 mutator 조합이 타입으로 연결되지 않고  
잘못된 mutator 순서도 컴파일 타임에 잡아내기 어려웠을 것이다.  

## 5. 이 코드에서 배운 점
- `(() => U) & { ... }` 패턴은 반환 타입 결합이 아니라 호출 시그니처 + 객체 속성의 결합이라는 점
- 타입 시스템에서 메타데이터를 다룰 때, **값이 아닌 ‘함수 자체’에 정보를 붙이는 방식**이 매우 유용하다는 점