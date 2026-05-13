export const REGION_OPTIONS = [
  { value: 'na1', label: 'North America', short: 'NA' },
  { value: 'euw1', label: 'Europe West', short: 'EUW' },
  { value: 'eun1', label: 'Europe Nordic & East', short: 'EUNE' },
  { value: 'kr', label: 'Korea', short: 'KR' },
  { value: 'br1', label: 'Brazil', short: 'BR' },
  { value: 'jp1', label: 'Japan', short: 'JP' },
  { value: 'la1', label: 'Latin America North', short: 'LAN' },
  { value: 'la2', label: 'Latin America South', short: 'LAS' },
  { value: 'tr1', label: 'Turkey', short: 'TR' },
  { value: 'ru', label: 'Russia', short: 'RU' },
  { value: 'oc1', label: 'Oceania', short: 'OCE' },
];

export const getRegionLabel = (value) => REGION_OPTIONS.find((region) => region.value === value)?.label || value.toUpperCase();
