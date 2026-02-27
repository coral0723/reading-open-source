# createImpl & create 분석

## 1. 이 코드의 역할
`createImpl`과 `create`는 `vanilla.ts`에서 만든 순수 자바스크립트 스토어를 리액트 생태계로 연결해주는 역할을 한다.  

사용자가 상태 정의 함수(`initializer`)를 넘기면,  
이를 리액트 훅으로 사용할 수 있도록 감싸서 반환해준다.  

## 2. 구현에서 눈에 띄는 점
### ① 타입 추론을 위한 커링(Currying) 설계
```
<T>(initializer: StateCreator<T, ...>): UseBoundStore<...> // (1) 한 번에 호출
<T>(): (initializer: StateCreator<T, ...>) => UseBoundStore<...> // (2) 두 번에 나눠 호출
```
**설명**  
사용자가 스토어의 타입 `T`를 직접 명시하고 싶어서 `create<MyState>(...)`라고 쓰면,  
뒤에 오는 미들웨어 타입(`Mos`)들까지 **전부 수동**으로 적어줘야 한다.  

이를 해결하기 위해 커링 구조를 선택하여 스토어의 타입은 명시하고 싶지만,  
미들웨어 타입은 직접 타이핑하기 싫은 개발자를 위해 타입을 단계별로 확정 지으려는 설계를 했다.  

### ② Object.assign을 통한 하이브리드 객체 생성
```
const useBoundStore: any = (selector?: any) => useStore(api, selector)
Object.assign(useBoundStore, api)
```
**설명**  
`createImpl` 내부에서는 `useStore`라는 훅을 만든 뒤,  
`Object.assign`을 통해 스토어의 API를 통째로 복사한다.  

이 덕분에 사용자는 동일한 변수를 `useMyStore()`처럼 훅으로 호출할 수도 있고,  
`useMyStore.getState()` 같이 내부의 API를 사용하고 싶을 때 일반 객체처럼 사용할 수도 있게 된다.  

### ③ 클로저를 활용한 인터페이스 간소화
```
const createImpl = <T>(...) => {
  const api = createStore(createState)
  const useBoundStore: any = (selector?: any) => useStore(api, selector)
  ...
}
```
**설명**
`react.ts`에서 정의된 `useStore`는 원래 첫 번째 인자로 api를 명시적으로 받아야 하는 훅이다.  
하지만 `createImpl` 내부에서는 이 `useStore`를 한 번 더 감싼 `useBoundStore`를 정의한다.  

이때 **클로저**가 사용된다.  
`useBoundStore`는 자신을 감싸고 있는 `createImpl` 스코프의 `api` 변수를 기억한다.  

결과적으로 사용자는 `useMyStore(api, selector)`라고 매번 스토어 객체를 넘길 필요 없이,  
이미 특정 스토어에 바인딩된 `useMyStore(selector)`를 사용할 수 있게 된다.  

클로저를 사용해 내부적으로 복잡한 인자 전달 과정을 뒤로 숨기고,  
사용자에게는 간단한 형태의 인터페이스만 노출시켜 DX를 향상시키려는 의도가 보여 눈에 띄었다.  


## 3. 왜 이렇게 설계했을까?
이 설계들은 사용자의 **DX(개발자 경험)**를 극대화하기 위한 설계라고 생각한다.  

타입스크립트에서 제네릭은 전부 적어나, 전부 추론하게 하거나 둘 중 하나를 선택해야 할 때가 많다.  
zustand는 미들웨어를 사용할 때 타입 작성이 매우 번거로울 수 있는데,  
커링을 통해 `T`만 고정해주면 나머지는 타입스크립트가 알아서 추론하게끔 설계한 것이다.  

또한, `Object.assign()`을 사용해 훅과 API를 하나로 합친 것은 사용자가 스토어를 관리하기 위해  
훅 따로, API 객체 따로 들고 다닐 필요 없이 하나만 `export`하면 모든 상황에 대응할 수 있게 설계한 것이다.  

## 4. 내가 만약 직접 만들었다면?
나는 아마 훅과 API를 별도의 속성으로 분리해서 반환했을 것 같다.

## 5. 이 코드에서 배운 점
- 커링이 타입스크립트의 단계적 타입 추론을 돕는 도구로 쓰일 수 있음
- 클로저를 사용해 편리한 인터페이스를 만드는 법