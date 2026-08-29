import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod';
import { listStaffQueryOptions } from '../-data-access-layer/staff.query-options';


const serachStaffSchema = z.object({
  page: z.number().optional().default(1),
  perPage: z.number().optional().default(50),
  sq: z.string().optional().default(''),
});

export const Route = createFileRoute('/_dashboard/admin/staff/')({
  component: RouteComponent,
  validateSearch: serachStaffSchema,
  loaderDeps(opts) {
    return {
      page: opts.search.page,
      perPage: opts.search.perPage,
      sq: opts.search.sq,
    };
  },
  loader: async ({ deps }) => {
    const { page, perPage, sq } = deps;
    return listStaffQueryOptions(page, perPage,sq);
  },
})

function RouteComponent() {
  return <div className='w-full min-h-screen flex flex-col items-center justify-center'>
    <div className='w-full max-w-7xl'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Staff</h1>
      </div>
    </div>
  </div>
}
