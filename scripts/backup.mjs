#!/usr/bin/env node
// ApplyAgent Database Backup Script
// Usage: node scripts/backup.mjs
// Schedule weekly with Task Scheduler or cron

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BACKUP_DIR = join(homedir(), 'applyagent-backups')
const MAX_BACKUPS = 10

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TABLES = [
  'profiles',
  'cv_documents',
  'credit_balances',
  'credit_transactions',
  'applications',
  'reports',
  'generated_files',
  'portal_companies',
  'pipeline_items',
  'story_bank',
  'scan_history',
  'title_filters',
  'archetypes',
  'stripe_events',
]

async function backup() {
  console.log('Starting backup...')
  mkdirSync(BACKUP_DIR, { recursive: true })

  const data = {}
  for (const table of TABLES) {
    try {
      const { data: rows, error } = await supabase.from(table).select('*')
      if (error) {
        console.log(`  ${table}: ERROR - ${error.message}`)
        data[table] = { error: error.message }
      } else {
        console.log(`  ${table}: ${rows.length} rows`)
        data[table] = rows
      }
    } catch (err) {
      console.log(`  ${table}: SKIP - ${err.message}`)
      data[table] = { error: err.message }
    }
  }

  // Also get auth users count
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    if (!error) {
      console.log(`  auth.users: ${users.length} users`)
      data['_auth_users'] = users.map(u => ({ id: u.id, email: u.email, created_at: u.created_at }))
    }
  } catch {}

  const date = new Date().toISOString().slice(0, 10)
  const filename = `applyagent-backup-${date}.json`
  const filepath = join(BACKUP_DIR, filename)

  const backup = {
    backup_date: new Date().toISOString(),
    tables: TABLES,
    data,
  }

  writeFileSync(filepath, JSON.stringify(backup, null, 2))
  const sizeMB = (Buffer.byteLength(JSON.stringify(backup)) / 1024 / 1024).toFixed(2)
  console.log(`\nBackup saved: ${filepath} (${sizeMB} MB)`)

  // Clean old backups
  const files = readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('applyagent-backup-') && f.endsWith('.json'))
    .sort()
    .reverse()

  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(MAX_BACKUPS)
    toDelete.forEach(f => {
      unlinkSync(join(BACKUP_DIR, f))
      console.log(`Deleted old backup: ${f}`)
    })
  }

  console.log('Done!')
}

backup().catch(err => {
  console.error('Backup failed:', err.message)
  process.exit(1)
})
