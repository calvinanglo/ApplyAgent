'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Save, CheckCircle2 } from 'lucide-react'
import { FileUpload } from '@/components/ui/file-upload'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
          <h1 className="text-2xl font-bold">Settings</h1>
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
            <Label>Target Roles (comma-separated)</Label>
            <Input
              placeholder="IT Security Analyst, Network Engineer, Cloud Engineer"
              value={targetRolesText}
              onChange={(e) => setTargetRolesText(e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Min Salary</Label>
              <Input
                type="number"
                value={profile.salary_min || ''}
                onChange={(e) => setProfile({ ...profile, salary_min: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Salary</Label>
              <Input
                type="number"
                value={profile.salary_max || ''}
                onChange={(e) => setProfile({ ...profile, salary_max: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={profile.salary_currency || 'CAD'}
                onChange={(e) => setProfile({ ...profile, salary_currency: e.target.value })}
              />
            </div>
          </div>
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
    </div>
  )
}
