'use client'; // Next.js / RSC 환경 대응

// forwardRef, useMemo, 타입 등 React 네임스페이스 통합 사용(tree-shaking / 타입 추론 측면에서 안정적인 패턴)
import * as React from 'react'; 

// 버튼의 행동 로직을 담당하는 핵심 훅
import { useButton } from '../use-button/useButton'; 

// 어떻게 렌더할지를 표준화한 함수
import { useRenderElement } from '../utils/useRenderElement';

// base-ui는 DOM 타입, 상태 타입, 컴포넌트 공통 인터페이스 타입 계층을 분리함
import type { BaseUIComponentProps, NativeButtonProps } from '../utils/types';

// Button 컴포넌트 정의
// 이 컴포넌트는 다른 UI 컴포넌트 내부에서 자주 사용된다.
// 따라서 부모 컴포넌트가 해당 컴포넌트의 DOM 엘리먼트에 직접 접근해야 할 상황이 많기에 forwardRef를 사용
export const Button = React.forwardRef(function Button(
  componentProps: Button.Props,
  forwardedRef: React.ForwardedRef<HTMLElement>,
) {
  // props 구조 분해
  const {
    render, 
    className,
    disabled = false,
    focusableWhenDisabled = false,
    nativeButton = true,
    ...elementProps
  } = componentProps;

  // 행동 로직
  // useButton은 이 버튼이 어떻게 동작해야 하는지를 계산
  // getButtonProps: 이벤트 핸들러 + aria 속성 + role 등을 포함
  // buttonRef: 내부 포커스 / 이벤트 관리를 위한 ref
  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled,
    native: nativeButton,
  });

  // 상태 정의
  // render 함수에게 전달되는 상태
  const state: Button.State = {
    disabled,
  };


  // 렌더링
  // Button 컴포넌트의 모든 정보를 모아서 최종적으로 어떤 요소를 어떤 props와 ref로 렌더링할지를 결정해준다.
  return useRenderElement('button', componentProps, {
    state,
    ref: [forwardedRef, buttonRef], // 사용자가 넘겨준 ref(forwardedRef)와 내가 관리할 ref(buttonRef)를 합친다
    props: [elementProps, getButtonProps],
  });
});

export interface ButtonState {
  disabled: boolean;
}

export interface ButtonProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ButtonState> {
  /**
   * Whether the button should be focusable when disabled.
   * @default false
   */
  focusableWhenDisabled?: boolean | undefined;
}

export namespace Button {
  export type State = ButtonState;
  export type Props = ButtonProps;
}