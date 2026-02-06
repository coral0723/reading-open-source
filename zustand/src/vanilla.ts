// setState의 실제 호출 시그니처 타입
type SetStateInternal<T> = {  
  _(
    partial: T | Partial<T> | { _(state: T): T | Partial<T> }['_'],
    replace?: false,
  ): void
  _(state: T | { _(state: T): T }['_'], replace: true): void
}['_']

// store의 최소 기능 집합을 정의한 인터페이스
export interface StoreApi<T> {
  setState: SetStateInternal<T>
  getState: () => T
  getInitialState: () => T
  subscribe: (listener: (state: T, prevState: T) => void) => () => void
}

// store처럼 보이는 객체로부터 상태(state) 타입을 추출하는 역할
export type ExtractState<S> = S extends { getState: () => infer T } ? T : never

// 추출된 상태(또는 객체 타입)에서 특정 key에 접근 가능한지 판단하고, 그 결과를 타입으로 반환
type Get<T, K, F> = K extends keyof T ? T[K] : F

// mutator들의 순서 있는 기록(Ms)을 따라가며,
// store 타입 S에 mutator를 하나씩 적용해 최종 store 타입을 계산하는 타입 레벨 실행 엔진
export type Mutate<S, Ms> = number extends Ms['length' & keyof Ms]
  ? S  // Ms는 배열
  : Ms extends [] // Ms는 튜플(재귀 종료 조건)
    ? S // Ms가 비어있다면 S 반환(재귀 종료)
    : Ms extends [[infer Mi, infer Ma], ...infer Mrs] // Ms에 아직 요소가 남아있다면
      ? Mutate<StoreMutators<S, Ma>[Mi & StoreMutatorIdentifier], Mrs>
      : never

// 각 middleware가 “이 mutator를 적용하면 store 타입이 이렇게 변한다”를 등록하는 
// mutator → 결과 store 타입 매핑용 공개 확장 슬롯
export interface StoreMutators<S, A> {}

// 현재 타입 시스템에 등록된 모든 mutator의 이름(key)만 모아둔 공식 mutator 식별자 집합
export type StoreMutatorIdentifier = keyof StoreMutators<unknown, unknown>

// store의 초기 상태와 로직을 정의하는 상태 생성 함수의 타입
export type StateCreator<
  T,
  Mis extends [StoreMutatorIdentifier, unknown][] = [],
  Mos extends [StoreMutatorIdentifier, unknown][] = [],
  U = T,
> = ((
  setState: Get<Mutate<StoreApi<T>, Mis>, 'setState', never>,
  getState: Get<Mutate<StoreApi<T>, Mis>, 'getState', never>,
  store: Mutate<StoreApi<T>, Mis>,
) => U) & { $$storeMutators?: Mos }

// StateCreator(설계도)를 받아 mutator 조합을 반영한 StoreApi(실제 store 인스턴스)로 변환하는 함수의 타입
type CreateStore = {
  <T, Mos extends [StoreMutatorIdentifier, unknown][] = []>(
    initializer: StateCreator<T, [], Mos>,
  ): Mutate<StoreApi<T>, Mos>

  <T>(): <Mos extends [StoreMutatorIdentifier, unknown][] = []>(
    initializer: StateCreator<T, [], Mos>,
  ) => Mutate<StoreApi<T>, Mos>
}

type CreateStoreImpl = <
  T,
  Mos extends [StoreMutatorIdentifier, unknown][] = [],
>(
  initializer: StateCreator<T, [], Mos>, // 해당 단계에서는 mutator가 이미 적용되어 있음(두 번째 인자가 빈 배열)
) => Mutate<StoreApi<T>, Mos>

// zustand에서 실제로 store 인스턴스를 만들고,
// state 변경·조회·구독 로직을 하나의 API로 묶는 핵심 생성 함수
const createStoreImpl: CreateStoreImpl = (createState) => {
  type TState = ReturnType<typeof createState>
  type Listener = (state: TState, prevState: TState) => void
  let state: TState
  const listeners: Set<Listener> = new Set() // 중복된 Listener들은 허용 안 함

  const setState: StoreApi<TState>['setState'] = (partial, replace) => {
    // TODO: Remove type assertion once https://github.com/microsoft/TypeScript/issues/37663 is resolved
    // https://github.com/microsoft/TypeScript/issues/37663#issuecomment-759728342
    const nextState =
      typeof partial === 'function'
        ? (partial as (state: TState) => TState)(state) // 함수면 현재 state를 넣어서 실행
        : partial // 함수가 아니라 값이면 그 자체를 nextState로 사용
    if (!Object.is(nextState, state)) { // nextState가 state가 같지 않을 때만 아래 로직을 실행
      const previousState = state // previousState가 state가 바라보던 값을 그대로 참조하게 함
      state = // 그 후 state의 값 변경
        (replace ?? (typeof nextState !== 'object' || nextState === null)) // replace가 명시되거나, nextState가 객체가 아니거나 null이 아닐 때
          ? (nextState as TState) // state에 nextState의 값을 덮어씌우기
          : Object.assign({}, state, nextState) // 아니라면 state와 nextState를 병합
      listeners.forEach((listener) => listener(state, previousState)) //subscribe에서 listener가 추가될 예정
    }
  }

  // 현재 상태(state) 반환
  const getState: StoreApi<TState>['getState'] = () => state

  // 초기 상태(initialState) 반환
  const getInitialState: StoreApi<TState>['getInitialState'] = () =>
    initialState

  const subscribe: StoreApi<TState>['subscribe'] = (listener) => {
    listeners.add(listener) // 인자로 받은 listener 함수를 listeners라는 Set에 등록
    // Unsubscribe
    return () => listeners.delete(listener) // 호출하면 해당 listener를 Set에서 제거하는 함수를 반환
  }

  // store API 객체
  const api = { setState, getState, getInitialState, subscribe }

  // 1. createState 실행
  const initialState = (state = createState(setState, getState, api))
  return api as any
}

export const createStore = ((createState) =>
  createState ? createStoreImpl(createState) : createStoreImpl) as CreateStore