// Share tools: generate the current plan (or an explicit historical state) as a
// reference, show a real read-only text preview plus the encoded share text,
// copy/save that text, and capture the visible plan preview as an image in a
// detached window. The image preview and its capture ref are supplied by the
// host (index) so the screenshot preserves the real plan presentation. This
// component never holds an opened reference and never dispatches or persists.

import { Button, Callout, Card, Intent, TextArea } from '@blueprintjs/core'
import { clipboard, remote } from 'electron'
import { outputFile } from 'fs-extra'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { captureRect } from '../planner/capture'
import { encodeReference } from './codec.ts'
import type { DecodedReference } from './types.ts'
import {
  errorMessageKey,
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

const Muted = styled.span`
  font-size: 0.85em;
  opacity: 0.8;
`

export interface ShareToolsProps {
  /** Captures the selected source (current plan or a historical revision). */
  onCapture: () => DecodedReference
  /** Human-readable description of the current source. */
  sourceLabel: string
  /** Disables generation when there is no shareable plan. */
  disabled?: boolean
  /** True in a detached window, where host image capture is available. */
  detached: boolean
  /** Reselects the current editable plan as the source. */
  onUseCurrent?: () => void
  /** The real plan preview element whose rendered pixels get captured. */
  imagePreview: React.ReactNode
  /** Ref to the element wrapped around `imagePreview`. */
  imageRef: React.RefObject<HTMLDivElement>
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

export const ShareTools = ({
  onCapture,
  sourceLabel,
  disabled = false,
  detached,
  onUseCurrent,
  imagePreview,
  imageRef,
  className,
}: ShareToolsProps) => {
  const { t } = useTranslation('poi-plugin-navy-staff')
  const [reference, setReference] = useState<DecodedReference | null>(null)
  const [shareText, setShareText] = useState('')
  const [errorKey, setErrorKey] = useState<ReferenceErrorMessageKey | null>(null)

  const handleGenerate = () => {
    setErrorKey(null)
    try {
      // Encode first: a codec failure must not pair a new preview with stale
      // copy/save text.
      const next = onCapture()
      const text = encodeReference(next)
      setReference(next)
      setShareText(text)
    } catch {
      setErrorKey('exportFailed')
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

  const handleImage = () => {
    if (!detached || !imageRef.current) return
    void captureRect(imageRef.current)
  }

  return (
    <div className={className} data-testid="share-tools">
      <SectionCard>
        <SectionTitle>{t('Share')}</SectionTitle>
        <Description>{sourceLabel}</Description>
        <Toolbar>
          {onUseCurrent && <Button text={t('Use current plan')} onClick={onUseCurrent} />}
          <Button text={t('Generate share text')} disabled={disabled} onClick={handleGenerate} />
          <Button
            text={t('Save to image')}
            disabled={disabled || !detached}
            onClick={handleImage}
          />
        </Toolbar>
        {!detached && (
          <Muted>{t('Image capture is only available in the detached window.')}</Muted>
        )}
      </SectionCard>

      {errorKey && (
        <Callout intent={Intent.DANGER} data-testid="share-error">
          {t(errorKey)}
        </Callout>
      )}

      <SectionCard data-testid="share-result">
        <SectionTitle>{t('Share text')}</SectionTitle>
        {reference ? (
          <ReferenceView reference={reference} />
        ) : (
          <Callout>{t('Generate a share text to preview the shared content.')}</Callout>
        )}
        {shareText && (
          <>
            <Toolbar>
              <Button icon="clipboard" onClick={handleCopy}>
                {t('Copy share text')}
              </Button>
              <Button icon="floppy-disk" onClick={() => void handleSave()}>
                {t('Save share text')}
              </Button>
            </Toolbar>
            <TextArea
              fill
              readOnly
              value={shareText}
              aria-label={t('Share text')}
              data-testid="share-text"
            />
          </>
        )}
      </SectionCard>

      <SectionCard>
        <SectionTitle>{t('Image preview')}</SectionTitle>
        <div ref={imageRef} data-testid="share-image-preview">
          {imagePreview}
        </div>
      </SectionCard>
    </div>
  )
}
