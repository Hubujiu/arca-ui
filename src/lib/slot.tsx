import * as React from "react"

type SlotProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode
}

export function Slottable({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function isSlottable(
  node: React.ReactNode,
): node is React.ReactElement<{ children?: React.ReactNode }> {
  return React.isValidElement(node) && node.type === Slottable
}

export const Slot = React.forwardRef<HTMLElement, SlotProps>(function Slot(
  { children, ...props },
  ref,
) {
  const nodes = React.Children.toArray(children)
  const slottable = nodes.find(isSlottable)
  const rest = nodes.filter((node) => node !== slottable)
  const target = slottable
    ? React.Children.only(slottable.props.children)
    : React.Children.only(children)

  if (!React.isValidElement(target)) return null

  const merged = {
    ...props,
    ...(target.props as object),
    className: [props.className, (target.props as { className?: string }).className]
      .filter(Boolean)
      .join(" "),
    style: {
      ...(props.style ?? {}),
      ...((target.props as { style?: React.CSSProperties }).style ?? {}),
    },
    ref,
  }

  const cloned = React.cloneElement(target, merged)
  if (!slottable) return cloned

  return (
    <>
      {cloned}
      {rest}
    </>
  )
})
