// Share tools: generate the selected source (current plan or an explicit
// historical revision) as frozen share text, then copy or save it. The generated
// text is decoded once into a frozen snapshot; the optional image preview and
// its Save action render that SAME snapshot through the shared read-only
// ReferenceView, so a later source change cannot alter either output. Copy uses
// the host clipboard through `@electron/remote` (Electron 44 removed the
// renderer clipboard and main-side writeText is async). This component never
// holds an opened reference, never dispatches, and never persists.

import { Button, Callout, Card, Intent, TextArea } from '@blueprintjs/core'
import { remote } from 'electron'
import { outputFile } from 'fs-extra'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { decodeReference, encodeReference } from './codec.ts'
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
  /** Reselects the current editable plan as the source. */
  onUseCurrent?: () => void
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
  onUseCurrent,
  className,
}: ShareToolsProps) => {
  const { t } = useTranslation('poi-plugin-navy-staff')
  const [shareText, setShareText] = useState('')
  // Decoded once from the generated text so text and image share one snapshot.
  const [snapshot, setSnapshot] = useState<DecodedReference | null>(null)
  const [resultLabel, setResultLabel] = useState('')
  const [errorKey, setErrorKey] = useState<ReferenceErrorMessageKey | null>(null)
  const [copyPending, setCopyPending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [imageRevealed, setImageRevealed] = useState(false)
  // True while the embedded ReferenceView is capturing: block replacing the
  // frozen snapshot so a late result cannot attach to different content.
  const [imageBusy, setImageBusy] = useState(false)
  const [resultId, setResultId] = useState(0)

  const handleGenerate = () => {
    if (copyPending || imageBusy) return
    setErrorKey(null)
    setCopied(false)
    try {
      const text = encodeReference(onCapture())
      // Decode the final text so normalizations are reflected identically in the
      // text and the image preview.
      setSnapshot(decodeReference(text))
      setShareText(text)
      setResultLabel(sourceLabel)
      setResultId((value) => value + 1)
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

  return (
    <div className={className} data-testid="share-tools">
      <SectionCard>
        <SectionTitle>{t('Share')}</SectionTitle>
        <Description>{sourceLabel}</Description>
        <Toolbar>
          {onUseCurrent && (
            <Button
              text={t('Use current plan')}
              disabled={copyPending || imageBusy}
              onClick={onUseCurrent}
            />
          )}
          <Button
            text={t('Start sharing')}
            disabled={disabled || copyPending || imageBusy}
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
          <Button
            text={t(imageRevealed ? 'Hide image preview' : 'Show image preview')}
            aria-expanded={imageRevealed}
            disabled={imageBusy || !snapshot}
            onClick={() => setImageRevealed((value) => !value)}
          />
        </ImageHeader>
        {imageRevealed && snapshot ? (
          <div data-testid="share-image-preview">
            <ReferenceView key={resultId} reference={snapshot} onCaptureBusyChange={setImageBusy} />
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}
