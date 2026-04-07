'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Save, CheckCircle2, AlertTriangle } from 'lucide-react'
import { FileUpload } from '@/components/ui/file-upload'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    location: '',
    target_roles: [] as string[],
    salary_min: 0,
    salary_max: 0,
    salary_currency: 'CAD',
  })
  const [targetRolesText, setTargetRolesText] = useState('')
  const [cvContent, setCvContent] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const [profileRes, cvRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single() as any,
      supabase.from('cv_documents').select('content').eq('user_id', user.id).eq('is_active', true).single() as any,
    ])

    if (profileRes.data) {
      setProfile(profileRes.data)
      setTargetRolesText((profileRes.data.target_roles || []).join(', '))
    }
    if (cvRes.data) setCvContent(cvRes.data.content)
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const supabase = createClient()

    const targetRoles = targetRolesText.split(',').map(r => r.trim()).filter(Boolean)

    const db = supabase as any
    await db.from('profiles').update({
      ...profile,
      target_roles: targetRoles,
      onboarding_completed: true,
    }).eq('id', userId)

    // Upsert CV
    if (cvContent.trim()) {
      const { data: existing } = await db
        .from('cv_documents')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (existing) {
        await db.from('cv_documents').update({ content: cvContent }).eq('id', existing.id)
      } else {
        await db.from('cv_documents').insert({ user_id: userId, content: cvContent })
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Your profile and CV configuration</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <Save className="size-4" />
          )}
          {saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your contact information and job search preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={profile.full_name || ''}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={profile.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={profile.location || ''}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>LinkedIn URL</Label>
              <Input
                value={profile.linkedin_url || ''}
                onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>GitHub URL</Label>
              <Input
                value={profile.github_url || ''}
                onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Portfolio URL</Label>
              <Input
                value={profile.portfolio_url || ''}
                onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Roles (comma-separated) <span className="text-destructive">*</span></Label>
            <Input
              placeholder="IT Security Analyst, Network Engineer, Cloud Engineer"
              value={targetRolesText}
              onChange={(e) => setTargetRolesText(e.target.value)}
              required
            />
            {!targetRolesText.trim() && (
              <p className="text-xs text-destructive">Required — evaluations use this to match you to roles</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Pay Type</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={(profile as any).salary_type || 'annual'}
                onChange={(e) => setProfile({ ...profile, salary_type: e.target.value } as any)}
              >
                <option value="annual">Annual Salary</option>
                <option value="hourly">Hourly Rate</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Min {(profile as any).salary_type === 'hourly' ? 'Rate' : 'Salary'}</Label>
              <Input
                type="number"
                placeholder={(profile as any).salary_type === 'hourly' ? 'e.g. 35' : 'e.g. 70000'}
                value={profile.salary_min || ''}
                onChange={(e) => setProfile({ ...profile, salary_min: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max {(profile as any).salary_type === 'hourly' ? 'Rate' : 'Salary'}</Label>
              <Input
                type="number"
                placeholder={(profile as any).salary_type === 'hourly' ? 'e.g. 55' : 'e.g. 100000'}
                value={profile.salary_max || ''}
                onChange={(e) => setProfile({ ...profile, salary_max: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={profile.salary_currency || 'CAD'}
                onChange={(e) => setProfile({ ...profile, salary_currency: e.target.value })}
              >
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="AUD">AUD</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div />
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Min 8 chars, number + special character"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
              />
            </div>
          </div>
          <Button
            variant="outline"
            disabled={passwordSaving || !newPassword || !currentPassword}
            onClick={async () => {
              setPasswordError(null)
              if (!currentPassword) {
                setPasswordError('Please enter your current password.')
                return
              }
              if (newPassword.length < 8 || !/\d/.test(newPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
                setPasswordError('Password must be at least 8 characters with a number and special character.')
                return
              }
              if (newPassword !== confirmPassword) {
                setPasswordError('Passwords do not match.')
                return
              }
              setPasswordSaving(true)
              const supabase = createClient()
              // Verify current password by re-authenticating
              const { data: { user } } = await supabase.auth.getUser()
              const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user?.email || '',
                password: currentPassword,
              })
              if (signInError) {
                setPasswordError('Current password is incorrect.')
                setPasswordSaving(false)
                return
              }
              const { error } = await supabase.auth.updateUser({ password: newPassword })
              if (error) {
                setPasswordError(error.message)
              } else {
                setPasswordSaved(true)
                setNewPassword('')
                setConfirmPassword('')
                setCurrentPassword('')
                setTimeout(() => setPasswordSaved(false), 3000)
              }
              setPasswordSaving(false)
            }}
          >
            {passwordSaving ? <Loader2 className="size-4 animate-spin" /> : passwordSaved ? <CheckCircle2 className="size-4" /> : null}
            {passwordSaved ? 'Updated!' : 'Update Password'}
          </Button>
          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CV / Resume</CardTitle>
          <CardDescription>
            Upload your resume (PDF, DOCX) or paste it in Markdown format. This is the source of truth for all evaluations and generated documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            onTextExtracted={(text) => setCvContent(text)}
            accept=".pdf,.docx,.txt,.md"
            label="Upload your resume"
            description="PDF, DOCX, TXT, or Markdown. Text will be extracted and editable below."
          />
          <Textarea
            placeholder="# Your Name&#10;&#10;## Professional Summary&#10;...&#10;&#10;## Work Experience&#10;..."
            value={cvContent}
            onChange={(e) => setCvContent(e.target.value)}
            rows={20}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>Permanently delete your account and all associated data.</CardDescription>
        </CardHeader>
        <CardContent>
          {!showDeleteConfirm ? (
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              Delete Account
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">
                This action is permanent. All your evaluations, reports, credits, and saved data will be deleted and cannot be recovered.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true)
                    const supabase = createClient()
                    await supabase.auth.signOut()
                    // Account deletion requires a server-side endpoint with service role
                    await fetch('/api/account/delete', { method: 'DELETE' })
                    router.push('/login')
                  }}
                >
                  {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
                  {deleting ? 'Deleting...' : 'Yes, delete my account'}
                </Button>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
