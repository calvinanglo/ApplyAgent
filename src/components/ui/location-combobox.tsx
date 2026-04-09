'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, ChevronDown, X } from 'lucide-react'

// ── Worldwide Locations Data ────────────────────────────────────────
interface LocationGroup {
  label: string
  locations: string[]
}

const LOCATION_GROUPS: LocationGroup[] = [
  {
    label: 'Anywhere',
    locations: ['Any', 'Remote', 'Hybrid'],
  },
  // ── Canada ──
  {
    label: 'Canada',
    locations: [
      'Canada',
      'Toronto, ON', 'Greater Toronto Area, ON', 'Ottawa, ON', 'Mississauga, ON',
      'Brampton, ON', 'Hamilton, ON', 'Kitchener, ON', 'London, ON',
      'Markham, ON', 'Vaughan, ON', 'Waterloo, ON', 'Guelph, ON', 'Oshawa, ON', 'Barrie, ON',
      'Vancouver, BC', 'Victoria, BC', 'Surrey, BC', 'Burnaby, BC', 'Kelowna, BC',
      'Calgary, AB', 'Edmonton, AB', 'Red Deer, AB', 'Lethbridge, AB',
      'Montreal, QC', 'Quebec City, QC', 'Gatineau, QC', 'Laval, QC', 'Sherbrooke, QC',
      'Winnipeg, MB', 'Saskatoon, SK', 'Regina, SK',
      'Halifax, NS', 'Moncton, NB', 'Fredericton, NB',
      "St. John's, NL", 'Charlottetown, PE',
      'Yellowknife, NT', 'Whitehorse, YT',
    ],
  },
  // ── United States ──
  {
    label: 'United States',
    locations: [
      'United States',
      'New York, NY', 'San Francisco, CA', 'Los Angeles, CA', 'San Jose, CA',
      'Seattle, WA', 'Austin, TX', 'Dallas, TX', 'Houston, TX',
      'Chicago, IL', 'Boston, MA', 'Denver, CO', 'Atlanta, GA',
      'Miami, FL', 'Washington, DC', 'Philadelphia, PA', 'San Diego, CA',
      'Portland, OR', 'Phoenix, AZ', 'Minneapolis, MN', 'Detroit, MI',
      'Raleigh, NC', 'Charlotte, NC', 'Nashville, TN', 'Salt Lake City, UT',
      'Pittsburgh, PA', 'Columbus, OH', 'Indianapolis, IN', 'Tampa, FL',
    ],
  },
  // ── United Kingdom ──
  {
    label: 'United Kingdom',
    locations: [
      'United Kingdom',
      'London, UK', 'Manchester, UK', 'Birmingham, UK', 'Edinburgh, UK',
      'Bristol, UK', 'Leeds, UK', 'Glasgow, UK', 'Cambridge, UK', 'Oxford, UK',
    ],
  },
  // ── Europe ──
  {
    label: 'Europe',
    locations: [
      'Europe',
      'Berlin, Germany', 'Munich, Germany', 'Hamburg, Germany', 'Frankfurt, Germany',
      'Amsterdam, Netherlands', 'Rotterdam, Netherlands',
      'Paris, France', 'Lyon, France',
      'Dublin, Ireland', 'Cork, Ireland',
      'Zurich, Switzerland', 'Geneva, Switzerland', 'Basel, Switzerland',
      'Stockholm, Sweden', 'Gothenburg, Sweden',
      'Copenhagen, Denmark',
      'Oslo, Norway',
      'Helsinki, Finland',
      'Barcelona, Spain', 'Madrid, Spain',
      'Lisbon, Portugal',
      'Milan, Italy', 'Rome, Italy',
      'Vienna, Austria',
      'Brussels, Belgium',
      'Warsaw, Poland', 'Krakow, Poland',
      'Prague, Czech Republic',
      'Bucharest, Romania',
      'Tallinn, Estonia',
    ],
  },
  // ── Asia Pacific ──
  {
    label: 'Asia Pacific',
    locations: [
      'Singapore',
      'Tokyo, Japan', 'Osaka, Japan',
      'Sydney, Australia', 'Melbourne, Australia', 'Brisbane, Australia',
      'Auckland, New Zealand', 'Wellington, New Zealand',
      'Hong Kong',
      'Seoul, South Korea',
      'Taipei, Taiwan',
      'Bangalore, India', 'Mumbai, India', 'Delhi, India', 'Hyderabad, India', 'Pune, India',
      'Shanghai, China', 'Beijing, China', 'Shenzhen, China',
      'Bangkok, Thailand',
      'Jakarta, Indonesia',
      'Kuala Lumpur, Malaysia',
      'Manila, Philippines',
      'Ho Chi Minh City, Vietnam', 'Hanoi, Vietnam',
    ],
  },
  // ── Middle East & Africa ──
  {
    label: 'Middle East & Africa',
    locations: [
      'Dubai, UAE', 'Abu Dhabi, UAE',
      'Tel Aviv, Israel',
      'Riyadh, Saudi Arabia',
      'Doha, Qatar',
      'Cape Town, South Africa', 'Johannesburg, South Africa',
      'Lagos, Nigeria', 'Nairobi, Kenya', 'Cairo, Egypt',
    ],
  },
  // ── Latin America ──
  {
    label: 'Latin America',
    locations: [
      'Sao Paulo, Brazil', 'Rio de Janeiro, Brazil',
      'Mexico City, Mexico', 'Guadalajara, Mexico', 'Monterrey, Mexico',
      'Buenos Aires, Argentina',
      'Bogota, Colombia', 'Medellin, Colombia',
      'Santiago, Chile',
      'Lima, Peru',
    ],
  },
]

// ── Component ───────────────────────────────────────────────────────

interface LocationComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function LocationCombobox({ value, onChange, placeholder = 'City, Country or Remote', className = '' }: LocationComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter locations based on search
  const filtered = search.trim()
    ? LOCATION_GROUPS.map(group => ({
        ...group,
        locations: group.locations.filter(loc =>
          loc.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(group => group.locations.length > 0)
    : LOCATION_GROUPS

  const flatFiltered = filtered.flatMap(g => g.locations)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-location-item]')
      items[highlightIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex])

  const selectLocation = useCallback((loc: string) => {
    onChange(loc === 'Any' ? '' : loc)
    setSearch('')
    setOpen(false)
    setHighlightIndex(-1)
    inputRef.current?.blur()
  }, [onChange])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      e.preventDefault()
      return
    }

    if (!open) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIndex(prev => Math.min(prev + 1, flatFiltered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightIndex >= 0 && highlightIndex < flatFiltered.length) {
          selectLocation(flatFiltered[highlightIndex])
        } else if (flatFiltered.length === 1) {
          selectLocation(flatFiltered[0])
        }
        break
      case 'Escape':
        setOpen(false)
        setHighlightIndex(-1)
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  const displayValue = open ? search : value

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          placeholder={placeholder}
          className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-8 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          onFocus={() => {
            setOpen(true)
            setSearch('')
            setHighlightIndex(-1)
          }}
          onChange={e => {
            setSearch(e.target.value)
            setHighlightIndex(-1)
            if (!open) setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {value ? (
          <button
            onClick={() => { onChange(''); setSearch(''); inputRef.current?.focus() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        )}
      </div>

      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-1"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No locations found
            </div>
          ) : (
            filtered.map(group => {
              const groupStartIndex = flatFiltered.indexOf(group.locations[0])
              return (
                <div key={group.label}>
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 bg-muted/30 sticky top-0 backdrop-blur-sm">
                    {group.label}
                  </div>
                  {group.locations.map((loc, i) => {
                    const flatIndex = groupStartIndex + i
                    const isHighlighted = flatIndex === highlightIndex
                    const isSelected = loc === value
                    return (
                      <button
                        key={loc}
                        data-location-item
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors cursor-default ${
                          isHighlighted ? 'bg-accent text-accent-foreground' : ''
                        } ${isSelected ? 'font-medium text-primary' : ''} hover:bg-accent hover:text-accent-foreground`}
                        onMouseDown={e => { e.preventDefault(); selectLocation(loc) }}
                        onMouseEnter={() => setHighlightIndex(flatIndex)}
                      >
                        <MapPin className="size-3 text-muted-foreground shrink-0" />
                        <span>{loc}</span>
                        {isSelected && <span className="ml-auto text-primary text-xs">&#10003;</span>}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
