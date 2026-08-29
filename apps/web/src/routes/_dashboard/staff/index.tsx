import { createFileRoute } from '@tanstack/react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export const Route = createFileRoute('/_dashboard/staff/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex h-full min-h-screen w-full flex-col items-center ">
      <Tabs defaultValue="account" className="w-full h-full min-w-fu;;`">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
        <TabsContent value="account">Make changes to your account here.</TabsContent>
        <TabsContent value="password">Change your password here.</TabsContent>
      </Tabs>
    </div>
  );
}
