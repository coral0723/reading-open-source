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
  initializer: StateCreator<T, [], Mos>,
) => Mutate<StoreApi<T>, Mos>

const createStoreImpl: CreateStoreImpl = (createState) => {
  type TState = ReturnType<typeof createState>
  type Listener = (state: TState, prevState: TState) => void
  let state: TState
  const listeners: Set<Listener> = new Set()

  const setState: StoreApi<TState>['setState'] = (partial, replace) => {
    // TODO: Remove type assertion once https://github.com/microsoft/TypeScript/issues/37663 is resolved
    // https://github.com/microsoft/TypeScript/issues/37663#issuecomment-759728342
    const nextState =
      typeof partial === 'function'
        ? (partial as (state: TState) => TState)(state)
        : partial
    if (!Object.is(nextState, state)) {
      const previousState = state
      state =
        (replace ?? (typeof nextState !== 'object' || nextState === null))
          ? (nextState as TState)
          : Object.assign({}, state, nextState)
      listeners.forEach((listener) => listener(state, previousState))
    }
  }

  const getState: StoreApi<TState>['getState'] = () => state

  const getInitialState: StoreApi<TState>['getInitialState'] = () =>
    initialState

  const subscribe: StoreApi<TState>['subscribe'] = (listener) => {
    listeners.add(listener)
    // Unsubscribe
    return () => listeners.delete(listener)
  }

  const api = { setState, getState, getInitialState, subscribe }
  const initialState = (state = createState(setState, getState, api))
  return api as any
}

export const createStore = ((createState) =>
  createState ? createStoreImpl(createState) : createStoreImpl) as CreateStore