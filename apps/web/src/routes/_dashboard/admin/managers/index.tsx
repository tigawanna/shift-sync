import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/admin/managers/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_dashboard/admin/managers/"!</div>
}
