// Reference tools: export the current plan as a reference, show/copy/save the
// share text, and import a reference by pasting text or opening a text file.
// Imported references live only in React state: this component never dispatches
// Redux actions, never writes persistence, and never creates an editable
// workspace.
//
// The native codec is imported through ./codec.ts; the browser preview maps that
// one module to preview/adapters/reference-codec.ts (see preview/aliases.ts).
// Clipboard and file access use the existing poi host boundaries, which the
// preview also mocks and records.

import { Button, ButtonGroup, Callout, Card, Intent, TextArea } from '@blueprintjs/core'
import { clipboard, remote } from 'electron'
import { outputFile } from 'fs-extra'
import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { decodeReference, encodeReference } from './codec.ts'
import type { DecodedReference } from './types.ts'
import {
  createRequestGuard,
  errorMessageKey,
  inputWithinLimit,
  shareFileName,
  type ReferenceErrorMessageKey,
} from './helpers.ts'
import { ReferenceView } from './reference-view.tsx'

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5em;
  flex-wrap: wrap;
`

const SectionCard = styled(Card)`
  &:not(:first-of-type) {
    margin-top: 1em;
  }
`

const SectionTitle = styled.h4`
  margin: 0 0 0.25em;
`

const Description = styled.p`
  margin: 0 0 0.75em;
  opacity: 0.8;
  font-size: 0.9em;
`

const ImportPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  margin-top: 0.5em;
`

// The file input is triggered by its own button, so it stays out of the tab
// order and off screen instead of appearing as a second redundant control.
const HiddenFileInput = styled.input`
  display: none;
`

export interface ReferenceToolsProps {
  /** Captures the current plan/workspace as a reference when export is clicked. */
  onExportCapture: () => DecodedReference
  /** Disables the export control when there is no exportable plan. */
  exportDisabled?: boolean
  /** Heading for the export section (defaults to Export reference). */
  exportTitle?: string
  /** One-line description of what the export will produce. */
  exportDescription?: string
  /** Notifies the parent when a reference is opened or closed (read-only). */
  onOpenChange?: (reference: DecodedReference | null) => void
  className?: string
}

const defaultSaveText = async (
  fileName: string,
  text: string,
): Promise<void> => {
  const { dialog } = remote
  const result = await dialog.showSaveDialog(remote.getCurrentWindow(), {
    defaultPath: fileName,
    filters: [{ extensions: ['txt'], name: 'Text file' }],
    title: fileName,
  })
  if (!result.canceled && result.filePath) {
    await outputFile(result.filePath, text)
  }
}

export const ReferenceTools = ({
  onExportCapture,
  exportDisabled = false,
  exportTitle,
  exportDescription,
  onOpenChange,
  className,
}: ReferenceToolsProps) => {
  const { t } = useTranslation('poi-plugin-navy-staff')
  const [reference, setReference] = useState<DecodedReference | null>(null)
  const [shareText, setShareText] = useState('')
  const [errorKey, setErrorKey] = useState<ReferenceErrorMessageKey | null>(null)
  const [importing, setImporting] = useState(false)
  const [draft, setDraft] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  // Guards one-shot file reads: closing, exporting, or a newer import makes any
  // in-flight read stale so a late resolution cannot reopen or overwrite state.
  const readGuard = useRef(createRequestGuard())

  const openReference = (next: DecodedReference) => {
    setReference(next)
    onOpenChange?.(next)
  }

  const handleExport = () => {
    readGuard.current.invalidate()
    setErrorKey(null)
    try {
      const next = onExportCapture()
      setShareText(encodeReference(next))
      openReference(next)
    } catch {
      setErrorKey('exportFailed')
    }
  }

  const handleDecode = (text: string) => {
    readGuard.current.invalidate()
    setErrorKey(null)
    try {
      const decoded = decodeReference(text)
      setShareText(text)
      setDraft('')
      setImporting(false)
      openReference(decoded)
    } catch (error) {
      setErrorKey(errorMessageKey(error))
    }
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    const token = readGuard.current.begin()
    // Bound before reading: never load an oversized file into memory.
    if (!inputWithinLimit(file.size)) {
      setErrorKey('shareTextTooLarge')
      return
    }
    try {
      const text = await file.text()
      if (!readGuard.current.isCurrent(token)) return
      handleDecode(text)
    } catch {
      if (!readGuard.current.isCurrent(token)) return
      setErrorKey('shareTextReadFailed')
    }
  }

  const handleCopy = () => {
    if (!shareText) return
    try {
      clipboard.writeText(shareText)
    } catch {
      setErrorKey('shareTextCopyFailed')
    }
  }

  const handleSave = async () => {
    if (!shareText) return
    setErrorKey(null)
    try {
      await defaultSaveText(shareFileName(new Date()), shareText)
    } catch {
      setErrorKey('shareTextSaveFailed')
    }
  }

  const handleClose = () => {
    readGuard.current.invalidate()
    setErrorKey(null)
    setDraft('')
    setImporting(false)
    setReference(null)
    setShareText('')
    onOpenChange?.(null)
  }

  return (
    <div className={className} data-testid="reference-tools">
      <SectionCard>
        <SectionTitle>{exportTitle ?? t('Export reference')}</SectionTitle>
        {exportDescription && <Description>{exportDescription}</Description>}
        <Toolbar>
          <Button icon="export" disabled={exportDisabled} onClick={handleExport}>
            {t('Export reference')}
          </Button>
        </Toolbar>
      </SectionCard>

      <SectionCard>
        <SectionTitle>{t('Import reference')}</SectionTitle>
        <Description>{t('importDescription')}</Description>
        <Toolbar>
          <Button
            icon="import"
            active={importing}
            onClick={() => setImporting((value) => !value)}
          >
            {t('Import reference')}
          </Button>
        </Toolbar>

        {importing && (
          <Callout>
            <ImportPanel>
              <TextArea
                fill
                value={draft}
                onChange={(event) => setDraft(event.currentTarget.value)}
                placeholder={t('Paste a share code or open a text file')}
                aria-label={t('Paste a share code or open a text file')}
              />
              <ButtonGroup>
                <Button
                  intent={Intent.PRIMARY}
                  disabled={draft.trim().length === 0}
                  onClick={() => handleDecode(draft)}
                >
                  {t('Open')}
                </Button>
                <Button onClick={() => fileInput.current?.click()}>
                  {t('Open file')}
                </Button>
              </ButtonGroup>
              <HiddenFileInput
                ref={fileInput}
                type="file"
                accept=".txt,text/plain"
                aria-label={t('Open file')}
                data-testid="reference-file-input"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0]
                  event.currentTarget.value = ''
                  void handleFile(file)
                }}
              />
            </ImportPanel>
          </Callout>
        )}
      </SectionCard>

      {errorKey && (
        <Callout intent={Intent.DANGER} data-testid="reference-error">
          {t(errorKey)}
        </Callout>
      )}

      {/* Produced or imported output is its own result section, labeled by the
          opened reference's title so it is never mistaken for the current
          workspace. */}
      {(shareText || reference) && (
        <SectionCard data-testid="reference-result">
          <SectionTitle>{reference?.title ?? t('Share text')}</SectionTitle>
          <Description>{t('Reference is read-only')}</Description>
          <Toolbar>
            {shareText && (
              <>
                <Button icon="clipboard" onClick={handleCopy}>
                  {t('Copy share text')}
                </Button>
                <Button icon="floppy-disk" onClick={() => void handleSave()}>
                  {t('Save share text')}
                </Button>
              </>
            )}
          </Toolbar>

          {shareText && (
            <TextArea
              fill
              readOnly
              value={shareText}
              aria-label={t('Share text')}
              data-testid="reference-share-text"
            />
          )}

          {reference && (
            <ReferenceView reference={reference} onClose={handleClose} />
          )}
        </SectionCard>
      )}
    </div>
  )
}
