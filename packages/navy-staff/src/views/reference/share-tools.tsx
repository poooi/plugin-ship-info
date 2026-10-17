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

// One generated result: the encoded text, the decoded snapshot it produced, and
// the source label captured at generation time. They change together, and the id
// remounts the image preview so a new result never reuses the previous snapshot.
interface GeneratedShareResult {
  text: string
  reference: DecodedReference
  label: string
  id: number
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
  const [result, setResult] = useState<GeneratedShareResult | null>(null)
  const [errorKey, setErrorKey] = useState<ReferenceErrorMessageKey | null>(null)
  const [copyPending, setCopyPending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [imageRevealed, setImageRevealed] = useState(false)
  // True while the embedded ReferenceView is capturing: block replacing the
  // frozen snapshot so a late result cannot attach to different content.
  const [imageBusy, setImageBusy] = useState(false)

  const handleGenerate = () => {
    if (copyPending || imageBusy) return
    setErrorKey(null)
    setCopied(false)
    try {
      const text = encodeReference(onCapture())
      // Decode the final text so normalizations are reflected identically in the
      // text and the image preview. Decode inside the try (not in the state
      // updater) so a decode failure shows the error instead of escaping.
      const reference = decodeReference(text)
      setResult((previous) => ({
        id: (previous?.id ?? 0) + 1,
        label: sourceLabel,
        reference,
        text,
      }))
    } catch {
      setErrorKey('exportFailed')
    }
  }

  const handleCopy = async () => {
    if (!result) return
    setErrorKey(null)
    setCopied(false)
    setCopyPending(true)
    try {
      await remote.clipboard.writeText(result.text)
      setCopied(true)
    } catch {
      setErrorKey('shareTextCopyFailed')
    } finally {
      setCopyPending(false)
    }
  }

  const handleSave = async () => {
    if (!result) return
    setErrorKey(null)
    try {
      await defaultSaveText(shareFileName(new Date()), result.text, t('Text file'))
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

        {result ? (
          <ResultBlock>
            <TextArea
              fill
              readOnly
              value={result.text}
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
            {result.label !== sourceLabel && (
              <Muted>{t('Share text source', { label: result.label })}</Muted>
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
            disabled={imageBusy || !result}
            onClick={() => setImageRevealed((value) => !value)}
          />
        </ImageHeader>
        {imageRevealed && result ? (
          <div data-testid="share-image-preview">
            <ReferenceView key={result.id} reference={result.reference} onCaptureBusyChange={setImageBusy} />
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}
