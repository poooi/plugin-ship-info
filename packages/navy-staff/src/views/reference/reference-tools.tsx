// Reference tools: open a shared reference by pasting text or choosing a file,
// then show it read-only. This component never generates share text, dispatches
// Redux actions, writes persistence, or creates an editable workspace. Its state
// is independent of the Share page.
//
// The native codec is imported through ./codec.ts; the browser preview maps that
// one module to preview/adapters/reference-codec.ts (see preview/aliases.ts).

import { Button, ButtonGroup, Callout, Card, Intent, TextArea } from '@blueprintjs/core'
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

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  margin-top: 0.5em;
`

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

// The file input is triggered by its own button, so it stays out of the tab
// order and off screen instead of appearing as a second redundant control.
const HiddenFileInput = styled.input`
  display: none;
`

export interface ReferenceToolsProps {
  className?: string
  /** Notifies the parent when a reference is opened or closed (read-only). */
  onOpenChange?: (reference: DecodedReference | null) => void
}

export const ReferenceTools = ({
  className,
  onOpenChange,
}: ReferenceToolsProps) => {
  const { t } = useTranslation('poi-plugin-navy-staff')
  const [reference, setReference] = useState<DecodedReference | null>(null)
  const [code, setCode] = useState('')
  const [errorKey, setErrorKey] = useState<ReferenceErrorMessageKey | null>(null)
  const [importing, setImporting] = useState(false)
  const [draft, setDraft] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  // Guards one-shot file reads: closing or a newer open makes an in-flight read
  // stale so a late resolution cannot reopen or overwrite state.
  const readGuard = useRef(createRequestGuard())

  const openReference = (next: DecodedReference, text: string) => {
    setReference(next)
    setCode(text)
    onOpenChange?.(next)
  }

  const handleDecode = (text: string) => {
    readGuard.current.invalidate()
    setErrorKey(null)
    try {
      const decoded = decodeReference(text)
      setDraft('')
      setImporting(false)
      openReference(decoded, text)
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

  const handleClose = () => {
    readGuard.current.invalidate()
    setErrorKey(null)
    setDraft('')
    setImporting(false)
    setReference(null)
    setCode('')
    onOpenChange?.(null)
  }

  return (
    <div className={className} data-testid="reference-tools">
      <SectionCard>
        <SectionTitle>{t('Open reference')}</SectionTitle>
        <Description>{t('OpenReferenceDescription')}</Description>
        <Toolbar>
          <Button
            icon="import"
            active={importing}
            onClick={() => setImporting((value) => !value)}
          >
            {t('Open reference')}
          </Button>
        </Toolbar>

        {importing && (
          <Callout>
            <Panel>
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
            </Panel>
          </Callout>
        )}
      </SectionCard>

      {errorKey && (
        <Callout intent={Intent.DANGER} data-testid="reference-error">
          {t(errorKey)}
        </Callout>
      )}

      {reference && (
        <SectionCard data-testid="reference-result">
          <ReferenceView reference={reference} onClose={handleClose} />
          {code && (
            <TextArea
              fill
              readOnly
              value={code}
              aria-label={t('Share text')}
              data-testid="reference-share-text"
            />
          )}
        </SectionCard>
      )}
    </div>
  )
}
