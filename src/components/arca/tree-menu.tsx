import { TreeMenu } from "@/components/watermelon/tree-menu"

const MENU = [
  {
    id: "product",
    label: "Product",
    children: [
      { id: "overview", label: "Overview" },
      {
        id: "features",
        label: "Features",
        children: [
          { id: "auth", label: "Auth" },
          { id: "billing", label: "Billing" },
        ],
      },
    ],
  },
  {
    id: "company",
    label: "Company",
    children: [
      { id: "about", label: "About" },
      { id: "careers", label: "Careers" },
    ],
  },
  { id: "blog", label: "Blog" },
]

export function TreeMenuDemo() {
  return <TreeMenu menuData={MENU} />
}
