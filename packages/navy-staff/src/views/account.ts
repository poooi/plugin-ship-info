import path from 'path'
import { readdir } from 'fs-extra'

import { isEnoent } from '@poi-plugins/shared/persistence'

import { PLUGIN_KEY } from './plugin-identity'

// Account-scoped persistence: each teitoku (member id) gets its own JSON file
// under a plugin directory. There is no in-file account binding.

const { APPDATA_PATH } = window

/** Directory holding one JSON file per account. */
export const ACCOUNT_DIR = path.join(APPDATA_PATH, PLUGIN_KEY)

// A KanColle member id is a positive integer rendered as digits. Restricting to
// digits avoids Windows reserved device names (CON, PRN, ...) and any path
// separators without a general slug grammar.
const NUMERIC_MEMBER_ID = /^[0-9]{1,20}$/u

/**
 * Normalizes a poi member identifier to its canonical digit string. Missing or
 * non-numeric identity is `null`, never a stringified placeholder.
 */
export const normalizeMemberId = (value: unknown): string | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? String(value) : null
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return NUMERIC_MEMBER_ID.test(trimmed) ? trimmed : null
  }
  return null
}

/** Deterministic file name for an account, or null when the id is unusable. */
export const accountFileName = (memberId: string): string | null => {
  const id = normalizeMemberId(memberId)
  return id ? `${id}.json` : null
}

/** Absolute account file path, or null when the id is unusable. */
export const accountFilePath = (memberId: string): string | null => {
  const name = accountFileName(memberId)
  return name ? path.join(ACCOUNT_DIR, name) : null
}

/** Whether a directory entry is an account file (shape only; never read). */
export const isAccountFileName = (name: string): boolean =>
  /^[0-9]{1,20}\.json$/u.test(name)

/**
 * Lists account JSON files in the account directory. A missing directory is the
 * only empty case; other read errors propagate.
 */
export const listAccountFiles = async (dir: string): Promise<string[]> => {
  try {
    return await readdir(dir)
  } catch (error) {
    if (isEnoent(error)) return []
    throw error
  }
}
