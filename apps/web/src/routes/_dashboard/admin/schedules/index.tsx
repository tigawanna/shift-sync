import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/admin/schedules/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_dashboard/admin/schedules/"!</div>
}
