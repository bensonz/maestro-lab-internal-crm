import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldGroup, FieldDescription } from '@/components/ui/field'
import { Settings, User, Bell, Save } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-chart-3/20 ring-1 ring-primary/20">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your profile and preferences
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile Information */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in-up">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                <User className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="font-display text-lg font-semibold text-foreground">
                Profile Information
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                  <Input
                    id="firstName"
                    className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    defaultValue="John"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                  <Input
                    id="lastName"
                    className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    defaultValue="Doe"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  defaultValue="john.doe@company.com"
                />
                <FieldDescription>
                  This email is used for notifications and account recovery.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input
                  id="phone"
                  className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  defaultValue="(555) 200-0001"
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/20">
                <Bell className="h-4 w-4 text-accent" />
              </div>
              <CardTitle className="font-display text-lg font-semibold text-foreground">
                Notification Preferences
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon...</p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <Button className="btn-glow h-11 rounded-xl bg-primary px-6 text-primary-foreground font-medium shadow-lg shadow-primary/30 transition-all duration-300 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/40">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
