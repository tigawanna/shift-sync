import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/admin/locations/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_dashboard/admin/locations/"!</div>
}
