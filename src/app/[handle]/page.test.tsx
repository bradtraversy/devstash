import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PublicProfile } from '@/lib/db/public';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
  permanentRedirect: vi.fn((path: string) => {
    throw new Error(`PERMANENT_REDIRECT:${path}`);
  }),
}));

vi.mock('@/lib/db/public', () => ({ getPublicProfile: vi.fn() }));

vi.mock('@/lib/item-previews', () => ({ getCodePreviews: vi.fn(async () => ({ 'item-1': [] })) }));

vi.mock('@/components/public/public-profile-view', () => ({
  default: ({ profile }: { profile: PublicProfile }) => <div data-handle={profile.handle} />,
}));

import { getPublicProfile } from '@/lib/db/public';
import { getCodePreviews } from '@/lib/item-previews';
import PublicProfilePage, { generateMetadata } from './page';

const mockGetPublicProfile = vi.mocked(getPublicProfile);

const profile: PublicProfile = {
  handle: 'brad',
  collections: [],
  collectionCount: 0,
  items: [
    {
      id: 'item-1',
      shortId: 'abc12345',
      title: 'useAuth Hook',
      description: null,
      content: 'export function useAuth() {}',
      url: null,
      language: 'typescript',
      fileName: null,
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
    },
  ],
  itemCount: 1,
};

const params = (handle: string) => ({ params: Promise.resolve({ handle }) });

describe('/[handle] page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders not found for a segment no handle could match, without querying', async () => {
    await expect(PublicProfilePage(params('wp-login.php'))).rejects.toThrow('NOT_FOUND');
    expect(mockGetPublicProfile).not.toHaveBeenCalled();
  });

  it('redirects a case variant to the lowercase path before querying', async () => {
    await expect(PublicProfilePage(params('Brad'))).rejects.toThrow('PERMANENT_REDIRECT:/brad');
    expect(mockGetPublicProfile).not.toHaveBeenCalled();
  });

  it('renders not found when the handle is unknown or has nothing public', async () => {
    mockGetPublicProfile.mockResolvedValue(null);

    await expect(PublicProfilePage(params('brad'))).rejects.toThrow('NOT_FOUND');
    expect(mockGetPublicProfile).toHaveBeenCalledWith('brad');
  });

  it('renders the profile with code previews for its items', async () => {
    mockGetPublicProfile.mockResolvedValue(profile);

    const element = await PublicProfilePage(params('brad'));

    expect(getCodePreviews).toHaveBeenCalledWith(profile.items);
    expect(element.props).toEqual({ profile, previews: { 'item-1': [] } });
  });

  it('returns empty metadata for an invalid segment or a missing profile', async () => {
    expect(await generateMetadata(params('wp-login.php'))).toEqual({});

    mockGetPublicProfile.mockResolvedValue(null);
    expect(await generateMetadata(params('brad'))).toEqual({});
  });

  it('builds profile metadata canonical at the profile path', async () => {
    mockGetPublicProfile.mockResolvedValue(profile);

    const metadata = await generateMetadata(params('brad'));

    expect(metadata.title).toBe('@brad | DevStash');
    expect(metadata.alternates).toEqual({ canonical: '/brad' });
  });
});
