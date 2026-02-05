import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  return (
    <div className="p-6 text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-slate-400">Manage your profile and preferences</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-white">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400">First Name</Label>
                <Input className="border-slate-700 bg-slate-800 text-white" defaultValue="John" />
              </div>
              <div>
                <Label className="text-slate-400">Last Name</Label>
                <Input className="border-slate-700 bg-slate-800 text-white" defaultValue="Doe" />
              </div>
            </div>
            <div>
              <Label className="text-slate-400">Email</Label>
              <Input className="border-slate-700 bg-slate-800 text-white" defaultValue="john.doe@company.com" />
            </div>
            <div>
              <Label className="text-slate-400">Phone</Label>
              <Input className="border-slate-700 bg-slate-800 text-white" defaultValue="(555) 200-0001" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-white">Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400">Coming soon...</p>
          </CardContent>
        </Card>

        <Button className="bg-emerald-600 hover:bg-emerald-700">Save Changes</Button>
      </div>
    </div>
  )
}
