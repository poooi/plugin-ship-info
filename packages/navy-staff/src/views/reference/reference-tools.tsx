// Reference tools: open a shared reference by pasting text or choosing a file,
// then show it read-only. The open controls appear immediately when nothing is
// open, and are hidden behind "Open another reference" once a reference is
// shown. This component never generates share text, dispatches Redux actions,
// writes persistence, or creates an editable workspace; its state is
// independent of the Share page.
//
// The native codec is imported through ./codec.ts; the browser preview maps that
// one module to preview/adapters/reference-codec.ts (see preview/aliases.ts).

import { Button, Callout, Card, Intent, TextArea } from '@blueprintjs/core'
import { remote } from 'electron'
import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { decodeReference } from './codec.ts'
import type { DecodedReference } from './types.ts'
import {
  createRequestGuard,
  errorMessageKey,
  inputWithinLimit,
  type ReferenceErrorMessageKey,
} from './helpers.ts'
import { ReferenceView } from './reference-view.tsx'

const FormCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const Disclosure = styled.div`
  margin-top: 12px;
`

// The file input is triggered by its own button, so it stays out of the tab
// order and off screen instead of appearing as a second redundant control.
const HiddenFileInput = styled.input`
  display: none;
`

export interface ReferenceToolsProps {
  className?: string
}

// One opened result: the decoded reference and the exact code it came from.
// They always change together, so they are a single piece of state.
interface OpenedReference {
  reference: DecodedReference
  code: string
}

export const ReferenceTools = ({ className }: ReferenceToolsProps) => {
  const { t } = useTranslation('poi-plugin-navy-staff')
  const [opened, setOpened] = useState<OpenedReference | null>(null)
  const [errorKey, setErrorKey] = useState<ReferenceErrorMessageKey | null>(null)
  const [importing, setImporting] = useState(false)
  const [draft, setDraft] = useState('')
  const [showCode, setShowCode] = useState(false)
  // While an image capture is pending, block replacing the reference so a late
  // result cannot attach to different content.
  const [captureBusy, setCaptureBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  // Guards one-shot file reads: cancelling, closing, or a newer open makes an
  // in-flight read stale so a late resolution cannot reopen or overwrite state.
  const readGuard = useRef(createRequestGuard())

  const openReference = (next: DecodedReference, text: string) => {
    setOpened({ code: text, reference: next })
    setShowCode(false)
    setDraft('')
    setImporting(false)
    setErrorKey(null)
  }

  const handleDecode = (text: string) => {
    if (captureBusy) return
    readGuard.current.invalidate()
    setErrorKey(null)
    try {
      // A failed replacement keeps the current reference in place.
      openReference(decodeReference(text), text)
    } catch (error) {
      setErrorKey(errorMessageKey(error))
    }
  }

  const handleFile = async (file?: File) => {
    if (!file || captureBusy) return
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

  // Reads the host clipboard on explicit request and only fills the draft, so
  // opening stays a separate, deliberate step. Reuses the file-read guard:
  // typing, opening, cancelling, closing, or a capture makes a late clipboard
  // result stale so it can never overwrite the current draft or reference.
  const handlePaste = async () => {
    if (captureBusy) return
    const token = readGuard.current.begin()
    setErrorKey(null)
    try {
      const text = await remote.clipboard.readText()
      if (!readGuard.current.isCurrent(token)) return
      // Bound against the same input limit before filling the field.
      if (!inputWithinLimit(text.length)) {
        setErrorKey('shareTextTooLarge')
        return
      }
      setDraft(text)
    } catch {
      if (!readGuard.current.isCurrent(token)) return
      setErrorKey('clipboardReadFailed')
    }
  }

  // Starting a capture invalidates any in-flight file read, so a delayed
  // resolve cannot replace the snapshot while it is being rendered.
  const handleCaptureBusyChange = (busy: boolean) => {
    setCaptureBusy(busy)
    if (busy) readGuard.current.invalidate()
  }

  const cancelForm = () => {
    readGuard.current.invalidate()
    setErrorKey(null)
    setDraft('')
    setImporting(false)
  }

  const handleClose = () => {
    readGuard.current.invalidate()
    setErrorKey(null)
    setDraft('')
    setImporting(false)
    setShowCode(false)
    setOpened(null)
  }

  const showForm = !opened || importing

  return (
    <div className={className} data-testid="reference-tools">
      {showForm && (
        <FormCard>
          <TextArea
            fill
            value={draft}
            onChange={(event) => {
              readGuard.current.invalidate()
              setDraft(event.currentTarget.value)
            }}
            placeholder={t('Paste a share code or open a text file')}
            aria-label={t('Paste a share code or open a text file')}
          />
          <Row>
            <Button
              intent={Intent.PRIMARY}
              disabled={captureBusy || draft.trim().length === 0}
              onClick={() => handleDecode(draft)}
            >
              {t('Open')}
            </Button>
            <Button icon="clipboard" disabled={captureBusy} onClick={() => void handlePaste()}>
              {t('Paste')}
            </Button>
            <Button disabled={captureBusy} onClick={() => fileInput.current?.click()}>
              {t('Open file')}
            </Button>
            {opened && <Button onClick={cancelForm}>{t('Cancel')}</Button>}
          </Row>
          {errorKey && (
            <Callout intent={Intent.DANGER} data-testid="reference-error">
              {t(errorKey)}
            </Callout>
          )}
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
        </FormCard>
      )}

      {opened && (
        <div data-testid="reference-result">
          <ReferenceView
            key={opened.code}
            reference={opened.reference}
            onCaptureBusyChange={handleCaptureBusyChange}
            onClose={handleClose}
            onReopen={() => {
              setErrorKey(null)
              setImporting(true)
            }}
          />
          {opened.code && (
            <Disclosure>
              <Button
                small
                minimal
                text={t(showCode ? 'Hide share text' : 'Show share text')}
                onClick={() => setShowCode((value) => !value)}
              />
              {showCode && (
                <TextArea
                  fill
                  readOnly
                  value={opened.code}
                  aria-label={t('Share text')}
                  data-testid="reference-share-text"
                />
              )}
            </Disclosure>
          )}
        </div>
      )}
    </div>
  )
}
