import { MOCK_LAB_MEMBER_PROFILES } from './mockLabMemberProfiles';

const explicitNameMap: Record<string, string> = {
  'sarah johnson': 'sarah-johnson',
  'michael chen': 'michael-chen',
  'emily brown': 'emily-brown',
  'james wilson': 'james-wilson',
  'lisa martinez': 'lisa-martinez',
  'david lee': 'david-lee',
  'anna kaya': 'anna-kaya',
  'bora demir': 'bora-demir',
  'nil ersoy': 'nil-ersoy',
  'johnson': 'sarah-johnson',
  'chen': 'michael-chen',
  'brown': 'emily-brown',
  'wilson': 'james-wilson',
  'martinez': 'lisa-martinez',
  'lee': 'david-lee',
  'kaya': 'anna-kaya',
  'demir': 'bora-demir',
  'ersoy': 'nil-ersoy',
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(dr|prof|professor)\.?\s+/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getLabMemberProfileIdByName(name: string): string | null {
  const normalized = normalizeName(name);

  if (explicitNameMap[normalized]) {
    return explicitNameMap[normalized];
  }

  const profileByName = MOCK_LAB_MEMBER_PROFILES.find(
    (profile) => normalizeName(profile.name) === normalized,
  );
  if (profileByName) {
    return profileByName.id;
  }

  const lastToken = normalized.split(' ').pop();
  if (!lastToken) {
    return null;
  }

  const byLastName = MOCK_LAB_MEMBER_PROFILES.find((profile) =>
    normalizeName(profile.name).endsWith(lastToken),
  );

  return byLastName?.id ?? null;
}
