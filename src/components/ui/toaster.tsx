"use client"

import {
  useToast,
  ToastProps
} from "@chakra-ui/react"

export const useToaster = () => {
  const toast = useToast()
  
  return {
    toast: (props: ToastProps) => {
      toast({
        position: "bottom-right",
        ...props,
      })
    }
  }
}

// No need for a Toaster component as Chakra UI handles this internally
