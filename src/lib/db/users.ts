import { prisma } from '@/lib/prisma';
import {
  type EditorPreferences,
  mergeWithDefaults,
} from '@/lib/constants/editor';
import { dedupePrefix, handleBase, uniqueSlug } from '@/lib/slugs';

export interface DashboardUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

/**
 * Get user by ID with fields needed for dashboard layout
 */
export async function getUserById(userId: string): Promise<DashboardUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true },
  });
}

export interface UserWithSettings extends DashboardUser {
  hasPassword: boolean;
  handle: string | null;
  createdAt: Date;
  editorPreferences: EditorPreferences;
}

/**
 * Get user by ID with fields needed for profile/settings pages
 */
export async function getUserWithSettings(userId: string): Promise<UserWithSettings | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      password: true,
      handle: true,
      createdAt: true,
      editorPreferences: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    hasPassword: !!user.password,
    handle: user.handle,
    createdAt: user.createdAt,
    editorPreferences: mergeWithDefaults(user.editorPreferences as Partial<EditorPreferences> | null),
  };
}

/**
 * Update user's editor preferences
 */
export async function updateEditorPreferences(
  userId: string,
  preferences: EditorPreferences
): Promise<boolean> {
  try {
    // Convert to plain JSON object for Prisma
    const jsonPreferences = JSON.parse(JSON.stringify(preferences));
    await prisma.user.update({
      where: { id: userId },
      data: { editorPreferences: jsonPreferences },
    });
    return true;
  } catch {
    return false;
  }
}

export type HandleClient = {
  user: {
    findUnique: typeof prisma.user.findUnique;
    findMany: typeof prisma.user.findMany;
    update: typeof prisma.user.update;
  };
};

/**
 * Returns the user's handle, generating one from the email local part the first time
 * a collection leaves private. The unique constraint on handle guards the race.
 */
export async function ensureUserHandle(client: HandleClient, userId: string): Promise<string> {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { handle: true, email: true },
  });

  if (!user) throw new Error('User not found');
  if (user.handle) return user.handle;

  const base = handleBase(user.email);
  const taken = await client.user.findMany({
    where: { handle: { startsWith: dedupePrefix(base) } },
    select: { handle: true },
  });
  const handle = uniqueSlug(
    base,
    taken.flatMap((row) => (row.handle ? [row.handle] : []))
  );

  await client.user.update({ where: { id: userId }, data: { handle } });
  return handle;
}

/**
 * Set the user's handle. A unique violation propagates so the action can report it.
 */
export async function updateUserHandle(userId: string, handle: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { handle } });
}

/**
 * Get user's editor preferences
 */
export async function getEditorPreferences(userId: string): Promise<EditorPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { editorPreferences: true },
  });

  return mergeWithDefaults(user?.editorPreferences as Partial<EditorPreferences> | null);
}
