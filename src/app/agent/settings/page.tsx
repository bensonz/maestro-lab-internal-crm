'use client'

import { User, Bell, Shield, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-6 p-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile */}
      <div className="card-terminal space-y-4" data-testid="settings-profile">
        <div className="mb-2 flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Profile
          </h3>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <span className="text-xl font-medium text-primary">JD</span>
          </div>
          <div>
            <p className="font-medium text-foreground">John Doe</p>
            <p className="text-sm text-muted-foreground">Agent #1042</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              defaultValue="John Doe"
              className="bg-background border-border"
              data-testid="settings-full-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              defaultValue="john.doe@agency.com"
              className="bg-background border-border"
              data-testid="settings-email"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              defaultValue="(555) 123-4567"
              className="bg-background border-border"
              data-testid="settings-phone"
            />
          </div>
          <div className="space-y-2">
            <Label>Agent ID</Label>
            <Input
              value="1042"
              disabled
              className="bg-muted border-border"
              data-testid="settings-agent-id"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div
        className="card-terminal space-y-4"
        data-testid="settings-notifications"
      >
        <div className="mb-2 flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Notifications
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Email Notifications
              </p>
              <p className="text-xs text-muted-foreground">
                Receive updates via email
              </p>
            </div>
            <Switch defaultChecked data-testid="switch-email-notifications" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Task Reminders
              </p>
              <p className="text-xs text-muted-foreground">
                Get reminded about pending tasks
              </p>
            </div>
            <Switch defaultChecked data-testid="switch-task-reminders" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Client Updates
              </p>
              <p className="text-xs text-muted-foreground">
                Notifications when clients progress
              </p>
            </div>
            <Switch defaultChecked data-testid="switch-client-updates" />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card-terminal space-y-4" data-testid="settings-security">
        <div className="mb-2 flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Security
          </h3>
        </div>

        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full justify-start"
            data-testid="btn-change-password"
          >
            Change Password
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            data-testid="btn-two-factor"
          >
            Two-Factor Authentication
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        <Button variant="terminal" data-testid="btn-save-settings">
          Save Changes
        </Button>
        <Button
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
          data-testid="btn-sign-out"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
