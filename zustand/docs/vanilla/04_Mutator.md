# Mutator 코드 분석

## 1. 이 코드의 역할
`Mutate<S, Ms>`, `StoreMutators<S, A>`, `StoreMutatorIdentifier`를 이해하기 위해서는  
먼저 zustand에서 말하는 **muatator가 무엇인지를 알아야 했다.**  

zustand에서 mutator는 store의 내부 상태를 직접 수정하는 로직이 아니라  
**store가 가지는 형태와 동작 자체를 확장 및 변형하는 개념**이다.  

즉, mutator는 store를 감싸거나, API를 추가하거나, 기존 동작을 확장하지만,  
그 실행은 런타임에서 이루어지고  
그 결과를 타입으로 정확히 반영하기 위한 장치가 바로 아래 코드들이다.  

- `Mutate<S, Ms>`  
: mutator들의 순서 있는 기록(`Ms`)을 따라가며 store 타입 `S`에 mutator를 하나씩 적용해  
최종 store 타입을 계산하는 **타입 레벨 실행 엔진**  
- `StoreMutators<S, A>`  
: 각 middleware가 "이 mutator를 적용하면 store 타입이 이렇게 변한다"를 등록하는  
**mutator → 결과 store 타입 매핑용 공개 확장 슬롯**  
- `StoreMutatorIdentifier`  
: 현재 타입 시스템에 등록된 모든 mutator의 이름(key)만 모아둔 **공식 mutator 식별자 집합**  

## 2. 구현에서 눈에 띄는 점
### ① 배열과 튜플을 구분하기 위해 `length`를 검사하는 방식  
```
number extends Ms['length' & keyof Ms]
```
**설명**  
이 조건은 "number가 Ms의 length에 대한 값과 key들의 정보를 담고 있는가"가 아니라,  
**"Ms의 길이를 타입 시스템이 알 수 있는가?"** 를 묻는다.  

```
// 일반 배열
type A = any[];
type L = A['length']; // number
```
- 길이를 알 수 없음
- `length`는 항상 `number`  

```
// 튜플
type T = [string, number];
type L = T['length']; // 2
```
- 길이가 고정됨
- `length`가 리터럴 타입  

이 차이를 이용해,  
Ms가 **구조를 알 수 없는 배열이면 타입 계산을 포기하고**,  
**길이가 고정된 튜플일 때만** mutator 적용을 계속 진행한다.  

```
number extends Ms['length' & keyof Ms]
  ? S
```
Ms가 배열이라면 **순서**, **개수**, **첫 요소의 형태**를 알 수 없다.  
이 상태에서는 mutator를 안전하게 적용할 수 없기 때문에,  
원래 store 타입 `S`를 그대로 반환한다.  

배열과 튜플이 `length`에서 서로 다른 타입을 가진다는 점을 타입 분기 조건으로 사용한 점이 인상 깊었다.

### ② 재귀 종료 조건을 명확히 분리한 구조
```
number extends Ms['length' & keyof Ms]
  ? S
```
**설명**  
이미 Ms가 **튜플임이 확정된 상태에서,**  
이 분기는 **더 이상 적용할 mutator가 있는가?** 를 판단한다.  
- mutator가 남아 있지 않다면 → 최종 결과는 현재 `S`
- 남아 있다면 → 다음 mutator를 적용하며 재귀 진행 

이렇게 타입 레벨에서도 재귀의 종료 조건을 명확히 분리했다는 점이 눈에 띄었다.  

### ③ 타입 레벨에서의 Head / Tail 분해
```
Ms extends [[infer Mi, infer Ma], ...infer Mrs]
```
처음에는 낯선 문법처럼 보였지만,  
Ms의 구조를 이해하고 나니  
**값 분해가 아니라 타입 레벨의 배열 구조 분해**임을 알 수 있었다.  

Ms는 다음과 같은 구조를 가진다.  
```
[
  [MutatorIdentifier, MutatorArgument],
  ...
]
```
위의 코드는 아래의 요소들을 각각 추출한다.  
- 첫 mutator의 식별자 → `Mi`
- 첫 mutator의 인자 → `Ma`
- 나머지 mutator들 → `Mrs`

즉, 추출한 요소를 **하나 적용한 뒤 나머지를 재귀로 넘기는 구조**를 타입으로 표현한 것이다.  

### ④ `StoreMutatorIdentifier`에서 `unknown`을 사용하는 이유
```
export type StoreMutatorIdentifier =
  keyof StoreMutators<unknown, unknown>
```
**설명**  
`StoreMutatorIdentifier`의 목적은  
mutator가 **"무엇을 하는지"** 가 아니라, **"어떤 mutator가 존재하는지"** 만 아는 것이다.  

mutator의 이름(key)는  
store 타입 `S`와 무관하고, 인자 타입 `A`와도 무관하다.  

반면 `S`, `A`에 실제 타입을 넣으면  
`StoreMutators`의 **Value 부분 타입만 바뀌게 된다.**  

그래서 zustand는 `S`, `A`에 의미 없는 `unknown`을 넣어 제네릭의 영향을 제거하고  
**순수한 mutator key 집합만 추출**한다.  

## 3. 왜 이렇게 설계했을까?
이 구조는 **mutator를 실행 로직이 아니라 "조합 가능한 개념"으로 다루기 위한 설계**로 보인다.  

mutator는 런타임에서 실행되지만  
그 조합 결과는 **타입 단계에서 미리 검증**된다.  

이를 통해 zustand는 middleware 조합 순서를 타입으로 강제하고,  
잘못된 조합은 런타임이 아니라 컴파일 타임에 실패시키며,  
store 확장을 **선언적이고 예측 가능하게 만든다.**  

즉, 이 설계는 **"유연함은 유지하면서도, 타입 안정성은 포기하지 않겠다"** 는 의도가 느껴진다.

## 4. 내가 만약 직접 만들었다면?
처음 구현했다면 아마 mutator 목록을 단순한 배열로 받고,  
적용 결과를 `any`나 `unknown`으로 처리했을 것 같다.  

그렇게 하면 mutator 순서에 따른 타입 변화가 표현되지 않을 뿐더러,  
잘못되 조합도 타입 단계에서 걸러지지 않았을 것이다.  

## 5. 이 코드에서 배운 점
- 배열과 튜플의 미묘한 차이를 이용해 타입 설계에서 분기 조건으로 사용하는 방법
- `[[infer A, infer B], ...infer Rest]` 형태를 통해 튜플의 Head / Tail 구조를 타입 레벨에서 표현하는 방법
- 조건부 타입은 단순한 분기 문법이 아니라, 타입 계산을 계속할지 중단할지를 결정하는 제어 흐름으로 사용할 수 있다.