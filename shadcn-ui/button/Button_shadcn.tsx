"use client" // Next.js / RSC 환경 대응

// 버튼의 "행동"을 담당하는 base-ui의 Button 컴포넌트
// UI 레이어의 기반(primitive)으로만 사용
import { Button as ButtonPrimitive } from "@base-ui/react/button"

// cva: variant / size 같은 스타일 분기 규칙을 선언적으로 정의하기 위해 사용
// VariantProps: cva 설정으로부터 타입을 자동 추론하기 위해 사용
import { cva, type VariantProps } from "class-variance-authority"

// shadcn에서 사용되는 여러 className을 안전하게 병합하는 유틸
// 조건부 클래스, cva 결과 등을 하나의 문자열로 정리
import { cn } from "@/registry/bases/base/lib/utils"

// 버튼의 기본 스타일
const buttonVariants = cva(
  // "최소한 이렇게 생겼다"를 보여줄 정도인 최소한의 스타일
  "cn-button inline-flex items-center justify-center whitespace-nowrap  transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
  {
    // 여기서부터 스타일 분기 정의
    variants: { 
      // 버튼의 의미/용도별 스타일
      variant: {
        default: "cn-button-variant-default",
        outline: "cn-button-variant-outline",
        secondary: "cn-button-variant-secondary",
        ghost: "cn-button-variant-ghost",
        destructive: "cn-button-variant-destructive",
        link: "cn-button-variant-link",
      },
      // 버튼의 크기 정의
      size: {
        default: "cn-button-size-default",
        xs: "cn-button-size-xs",
        sm: "cn-button-size-sm",
        lg: "cn-button-size-lg",
        icon: "cn-button-size-icon",
        "icon-xs": "cn-button-size-icon-xs",
        "icon-sm": "cn-button-size-icon-sm",
        "icon-lg": "cn-button-size-icon-lg",
      },
    },
    // props를 넘기지 않았을 때의 기본값
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Button 컴포넌트
function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) { // base-ui Button의 props를 그대로 확장
  // 실제 렌더링은 base-ui Button에게 위임
  return ( 
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}  // cva로 계산한 클래스 + 외부에서 받은 className 병합
      {...props} // onClick, disabled 등 모든 행동 관련 props는 그대로 전달
    />
  )
}

export { Button, buttonVariants }