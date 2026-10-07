import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'

export interface GitHubEmail {
  email: string
  primary: boolean
  verified: boolean
}

/** GitHub only lets a verified address be the public one, so it wins; otherwise a verified address from the list, never an unverified one. */
export function pickGitHubEmail(publicEmail: string | null | undefined, emails: GitHubEmail[] | null): string | null {
  if (publicEmail) return publicEmail
  const verified = (emails ?? []).filter((e) => e.verified)
  return (verified.find((e) => e.primary) ?? verified[0])?.email ?? null
}

const GITHUB_API = 'https://api.github.com'

async function fetchGitHub(path: string, accessToken: string | undefined) {
  return fetch(`${GITHUB_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'authjs' },
  })
}

/** Auth.js's own GitHub request takes the primary address whether or not it is verified. */
export async function requestGitHubProfile({ tokens }: { tokens: { access_token?: string } }) {
  const profile = await fetchGitHub('/user', tokens.access_token).then((res) => res.json())
  let emails: GitHubEmail[] | null = null
  if (!profile.email) {
    const res = await fetchGitHub('/user/emails', tokens.access_token)
    if (res.ok) emails = await res.json()
  }
  return { ...profile, email: pickGitHubEmail(profile.email, emails) }
}

export const gitHubProvider = GitHub({
  userinfo: { url: `${GITHUB_API}/user`, request: requestGitHubProfile },
})

export const googleProvider = Google({ allowDangerousEmailAccountLinking: true })
