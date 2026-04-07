'use client'

import { useState, useEffect } from 'react'
import { Country, State, City } from 'country-state-city'
import { Label } from '@/components/ui/label'

interface LocationSelectProps {
  value: string
  onChange: (location: string) => void
}

export function LocationSelect({ value, onChange }: LocationSelectProps) {
  const parts = (value || '').split(',').map(p => p.trim())
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  // Parse existing location on mount
  useEffect(() => {
    if (!value) return
    const countries = Country.getAllCountries()
    const cityPart = parts[0] || ''
    const statePart = parts[1] || ''
    const countryPart = parts[2] || parts[1] || ''

    // Try to match country
    const matchedCountry = countries.find(c =>
      c.name.toLowerCase() === countryPart.toLowerCase() ||
      c.isoCode.toLowerCase() === countryPart.toLowerCase()
    )
    if (matchedCountry) {
      setSelectedCountry(matchedCountry.isoCode)
      // Try to match state
      const states = State.getStatesOfCountry(matchedCountry.isoCode)
      const matchedState = states.find(s =>
        s.name.toLowerCase() === statePart.toLowerCase() ||
        s.isoCode.toLowerCase() === statePart.toLowerCase()
      )
      if (matchedState) {
        setSelectedState(matchedState.isoCode)
        setSelectedCity(cityPart)
      }
    }
  }, [])

  const countries = Country.getAllCountries()
  const states = selectedCountry ? State.getStatesOfCountry(selectedCountry) : []
  const cities = selectedCountry && selectedState ? City.getCitiesOfState(selectedCountry, selectedState) : []

  function updateLocation(country: string, state: string, city: string) {
    const countryName = Country.getCountryByCode(country)?.name || ''
    const stateName = states.find(s => s.isoCode === state)?.name || state
    const parts = [city, stateName, countryName].filter(Boolean)
    onChange(parts.join(', '))
  }

  const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm"

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2">
        <Label>Country</Label>
        <select
          className={selectClass}
          value={selectedCountry}
          onChange={(e) => {
            setSelectedCountry(e.target.value)
            setSelectedState('')
            setSelectedCity('')
            const name = Country.getCountryByCode(e.target.value)?.name || ''
            onChange(name)
          }}
        >
          <option value="">Select country...</option>
          {countries.map(c => (
            <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Province / State</Label>
        <select
          className={selectClass}
          value={selectedState}
          onChange={(e) => {
            setSelectedState(e.target.value)
            setSelectedCity('')
            updateLocation(selectedCountry, e.target.value, '')
          }}
          disabled={!selectedCountry || states.length === 0}
        >
          <option value="">{states.length === 0 ? 'N/A' : 'Select...'}</option>
          {states.map(s => (
            <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>City</Label>
        {cities.length > 0 ? (
          <select
            className={selectClass}
            value={selectedCity}
            onChange={(e) => {
              setSelectedCity(e.target.value)
              updateLocation(selectedCountry, selectedState, e.target.value)
            }}
            disabled={!selectedState}
          >
            <option value="">Select city...</option>
            {cities.map(c => (
              <option key={c.name + c.latitude} value={c.name}>{c.name}</option>
            ))}
          </select>
        ) : (
          <input
            className={`${selectClass} outline-none`}
            placeholder="Type city name..."
            value={selectedCity}
            onChange={(e) => {
              setSelectedCity(e.target.value)
              updateLocation(selectedCountry, selectedState, e.target.value)
            }}
            disabled={!selectedCountry}
          />
        )}
      </div>
    </div>
  )
}
