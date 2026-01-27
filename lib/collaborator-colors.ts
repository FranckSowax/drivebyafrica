// Pre-defined palette of 10 visually distinct colors for collaborator badges
export const COLLABORATOR_COLORS = [
  { name: 'Blue', hex: '#3B82F6', textClass: 'text-white' },
  { name: 'Purple', hex: '#8B5CF6', textClass: 'text-white' },
  { name: 'Pink', hex: '#EC4899', textClass: 'text-white' },
  { name: 'Amber', hex: '#F59E0B', textClass: 'text-black' },
  { name: 'Emerald', hex: '#10B981', textClass: 'text-white' },
  { name: 'Cyan', hex: '#06B6D4', textClass: 'text-white' },
  { name: 'Rose', hex: '#F43F5E', textClass: 'text-white' },
  { name: 'Indigo', hex: '#6366F1', textClass: 'text-white' },
  { name: 'Lime', hex: '#84CC16', textClass: 'text-black' },
  { name: 'Teal', hex: '#14B8A6', textClass: 'text-white' },
] as const;

export type CollaboratorColor = (typeof COLLABORATOR_COLORS)[number];

/**
 * Get initials from a full name
 * "Jean Dupont" -> "JD"
 * "Marie" -> "MA"
 */
export function getCollaboratorInitials(fullName: string | null | undefined): string {
  if (!fullName) return '??';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Get a color from the palette by index (wraps around)
 */
export function getColorByIndex(index: number): CollaboratorColor {
  return COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length];
}

/**
 * Get a deterministic color from a user ID (for users without assigned color)
 * Uses a simple hash to always return the same color for the same user
 */
export function getColorFromUserId(userId: string): CollaboratorColor {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return getColorByIndex(hash);
}

/**
 * Get the appropriate text class (white or black) for a given hex color
 * Falls back to white for unknown colors
 */
export function getTextClassForColor(hex: string | null | undefined): string {
  if (!hex) return 'text-white';
  const color = COLLABORATOR_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
  return color?.textClass || 'text-white';
}

/**
 * Validate if a color is from our palette
 */
export function isValidCollaboratorColor(hex: string | null | undefined): boolean {
  if (!hex) return false;
  return COLLABORATOR_COLORS.some((c) => c.hex.toLowerCase() === hex.toLowerCase());
}
