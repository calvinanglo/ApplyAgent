'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react'

interface Story {
  id: string
  title: string
  jd_requirement: string | null
  situation: string | null
  task: string | null
  action: string | null
  result: string | null
  reflection: string | null
  tags: string[]
  source_report_id: string | null
  created_at: string
}

interface Report {
  id: string
  company: string
  role: string
}

export default function StoryBankPage() {
  const [stories, setStories] = useState<Story[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [reportMap, setReportMap] = useState<Record<string, Report>>({})
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadStories()
  }, [])

  async function loadStories() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await (supabase as any)
      .from('story_bank')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      const storyData = data as Story[]
      setStories(storyData)

      // Load report details for stories that have source_report_id
      const reportIds = [...new Set(storyData.filter(s => s.source_report_id).map(s => s.source_report_id!))]
      if (reportIds.length > 0) {
        const { data: reports } = await (supabase as any)
          .from('reports')
          .select('id, company, role')
          .in('id', reportIds)

        if (reports) {
          const map: Record<string, Report> = {}
          for (const r of reports as Report[]) {
            map[r.id] = r
          }
          setReportMap(map)
        }
      }
    }

    setLoading(false)
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function deleteStory(id: string) {
    const supabase = createClient()
    await (supabase as any).from('story_bank').delete().eq('id', id)
    setStories(prev => prev.filter(s => s.id !== id))
  }

  // Collect all unique tags
  const allTags = [...new Set(stories.flatMap(s => s.tags || []))]

  const filtered = filterTag
    ? stories.filter(s => s.tags?.includes(filterTag))
    : stories

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Story Bank</h1>
          <p className="text-muted-foreground">
            STAR+R stories accumulated from evaluations. Use these in interviews.
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {stories.length} {stories.length === 1 ? 'story' : 'stories'}
        </Badge>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterTag(null)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              !filterTag ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                filterTag === tag ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" className="rounded" checked={selectedStories.size > 0 && filtered.every(s => selectedStories.has(s.id))} onChange={(e) => {
              if (e.target.checked) setSelectedStories(new Set(filtered.map(s => s.id)))
              else setSelectedStories(new Set())
            }} />
            Select all
          </label>
          {selectedStories.size > 0 && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => {
              if (window.confirm(`Remove ${selectedStories.size} selected story(ies)?`)) {
                const supabase = createClient()
                const ids = Array.from(selectedStories)
                await (supabase as any).from('story_bank').delete().in('id', ids)
                setStories(prev => prev.filter(s => !ids.includes(s.id)))
                setSelectedStories(new Set())
              }
            }}>
              <Trash2 className="size-4" />Remove ({selectedStories.size})
            </Button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No stories yet. Stories are automatically saved when you run evaluations (Block F).
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(story => {
            const isOpen = expanded.has(story.id)
            const report = story.source_report_id ? reportMap[story.source_report_id] : null

            return (
              <Card key={story.id}>
                <CardHeader
                  className="cursor-pointer py-3"
                  onClick={() => toggleExpand(story.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" className="rounded shrink-0" checked={selectedStories.has(story.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => {
                        const next = new Set(selectedStories)
                        if (e.target.checked) next.add(story.id); else next.delete(story.id)
                        setSelectedStories(next)
                      }} />
                      {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      <div>
                        <CardTitle className="text-base">{story.title}</CardTitle>
                        {story.jd_requirement && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Answers: {story.jd_requirement}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {story.tags?.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {report && (
                        <Badge variant="outline" className="text-xs">
                          {report.company}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isOpen && (
                  <CardContent className="border-t pt-4 space-y-3">
                    {story.situation && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Situation</p>
                        <p className="text-sm">{story.situation}</p>
                      </div>
                    )}
                    {story.task && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Task</p>
                        <p className="text-sm">{story.task}</p>
                      </div>
                    )}
                    {story.action && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Action</p>
                        <p className="text-sm">{story.action}</p>
                      </div>
                    )}
                    {story.result && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Result</p>
                        <p className="text-sm">{story.result}</p>
                      </div>
                    )}
                    {story.reflection && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Reflection</p>
                        <p className="text-sm italic">{story.reflection}</p>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(story.created_at).toLocaleDateString()}
                        {report && ` from ${report.company} - ${report.role}`}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteStory(story.id)
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
