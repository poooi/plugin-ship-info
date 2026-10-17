// Share tools: generate the selected source (current plan or an explicit
// historical revision) as frozen share text, then copy or save it. Copy uses
// the host clipboard through `@electron/remote` (Electron 44 removed the
// renderer clipboard and main-side writeText is async). The image share is a
// separate section: the real plan preview is captured from the DOM with the
// existing capture path and is only mounted when explicitly revealed in a
// detached window. This component never holds an opened reference, never
// dispatches, and never persists.

import { Button, Callout, Card, Intent, TextArea } from '@blueprintjs/core'
import { remote } from 'electron'
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

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const SectionCard = styled(Card)`
  padding: 16px;

  &:not(:first-of-type) {
    margin-top: 16px;
  }
`

const SectionTitle = styled.h4`
  margin: 0 0 4px;
  font-size: 1em;
`

const Description = styled.p`
  margin: 0 0 12px;
  opacity: 0.8;
  font-size: 0.9em;
`

const Muted = styled.span`
  font-size: 0.85em;
  opacity: 0.8;
`

const Copied = styled.span`
  color: ${(props) => props.theme.GREEN3};
  font-size: 0.85em;
`

// Distinct result block: textarea, then an action/outcome row 8px below.
const ResultBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
`

const HeaderSpacer = styled.div`
  flex: 1 1 0;
`

// Image header and its reveal/save control share one aligned row.
const ImageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  ${SectionTitle} {
    margin: 0;
  }
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
  filterName: string,
): Promise<void> => {
  const { dialog } = remote
  const result = await dialog.showSaveDialog(remote.getCurrentWindow(), {
    defaultPath: fileName,
    filters: [{ extensions: ['txt'], name: filterName }],
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
  const [shareText, setShareText] = useState('')
  // Frozen at generation time so a later source change cannot mislabel the text.
  const [resultLabel, setResultLabel] = useState('')
  const [errorKey, setErrorKey] = useState<ReferenceErrorMessageKey | null>(null)
  const [copyPending, setCopyPending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [imageRevealed, setImageRevealed] = useState(false)

  const handleGenerate = () => {
    // Never replace the result while a copy of the previous one is in flight.
    if (copyPending) return
    setErrorKey(null)
    setCopied(false)
    try {
      // Encode first: a codec failure must not pair a new result with stale text.
      const text = encodeReference(onCapture())
      setShareText(text)
      setResultLabel(sourceLabel)
    } catch {
      setErrorKey('exportFailed')
    }
  }

  const handleCopy = async () => {
    if (!shareText) return
    setErrorKey(null)
    setCopied(false)
    setCopyPending(true)
    try {
      // remote.clipboard.writeText is async on current Electron; catch both a
      // rejected promise and a synchronous throw.
      await remote.clipboard.writeText(shareText)
      setCopied(true)
    } catch {
      setErrorKey('shareTextCopyFailed')
    } finally {
      setCopyPending(false)
    }
  }

  const handleSave = async () => {
    if (!shareText) return
    setErrorKey(null)
    try {
      await defaultSaveText(shareFileName(new Date()), shareText, t('Text file'))
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
          {onUseCurrent && (
            <Button
              text={t('Use current plan')}
              disabled={copyPending}
              onClick={onUseCurrent}
            />
          )}
          <Button
            text={t('Generate share text')}
            disabled={disabled || copyPending}
            onClick={handleGenerate}
          />
        </Toolbar>

        {shareText ? (
          <ResultBlock>
            <TextArea
              fill
              readOnly
              value={shareText}
              aria-label={t('Share text')}
              data-testid="share-text"
            />
            <Toolbar>
              <Button
                text={t('Copy share text')}
                disabled={copyPending}
                onClick={() => void handleCopy()}
              />
              <Button text={t('Save share text')} onClick={() => void handleSave()} />
              {copied && <Copied>{t('Copied')}</Copied>}
              {errorKey && (
                <Callout intent={Intent.DANGER} data-testid="share-error">
                  {t(errorKey)}
                </Callout>
              )}
            </Toolbar>
            {/* Only when the frozen source differs from the current one. */}
            {resultLabel !== sourceLabel && (
              <Muted>{t('Share text source', { label: resultLabel })}</Muted>
            )}
          </ResultBlock>
        ) : (
          <>
            {errorKey && (
              <Callout intent={Intent.DANGER} data-testid="share-error">
                {t(errorKey)}
              </Callout>
            )}
            <Muted>{t('shareTextEmptyHint')}</Muted>
          </>
        )}
      </SectionCard>

      <SectionCard>
        <ImageHeader>
          <SectionTitle>{t('Image')}</SectionTitle>
          <HeaderSpacer />
          {detached && (
            <>
              {imageRevealed && (
                <Button text={t('Save to image')} disabled={disabled} onClick={handleImage} />
              )}
              <Button
                text={t(imageRevealed ? 'Hide image preview' : 'Show image preview')}
                aria-expanded={imageRevealed}
                disabled={disabled}
                onClick={() => setImageRevealed((value) => !value)}
              />
            </>
          )}
        </ImageHeader>
        {detached ? (
          imageRevealed ? (
            <div ref={imageRef} data-testid="share-image-preview">
              {imagePreview}
            </div>
          ) : null
        ) : (
          <Muted>{t('imageCaptureDetachedOnly')}</Muted>
        )}
      </SectionCard>
    </div>
  )
}
