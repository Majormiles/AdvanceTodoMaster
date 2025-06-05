import { Tooltip as ChakraTooltip, TooltipProps as ChakraTooltipProps } from "@chakra-ui/react"
import * as React from "react"

export interface TooltipProps extends Omit<ChakraTooltipProps, 'children' | 'label'> {
  content: string
  children: React.ReactNode
  disabled?: boolean
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  function Tooltip({ content, children, disabled, ...props }) {
    if (disabled) return <>{children}</>

    return (
      <ChakraTooltip label={content} {...props}>
        {children}
      </ChakraTooltip>
    )
  }
)
