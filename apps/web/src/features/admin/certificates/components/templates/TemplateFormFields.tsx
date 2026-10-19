import type { CertificateTemplateOrientation } from '@/shared/types/certificates-db'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { PAGE_SIZE_OPTIONS } from '../../lib/templateDisplay'

export interface TemplateDraft {
  name: string
  description: string
  orientation: CertificateTemplateOrientation
  pageSize: string
}

export const EMPTY_TEMPLATE_DRAFT: TemplateDraft = {
  name: '',
  description: '',
  orientation: 'landscape',
  pageSize: 'A4',
}

interface TemplateFormFieldsProps {
  /** Prefixo dos ids, para o formulário de criar e o de editar não repetirem ids na página. */
  idPrefix: string
  draft: TemplateDraft
  onChange: (patch: Partial<TemplateDraft>) => void
  nameLabel: string
  namePlaceholder: string
  descriptionLabel: string
  descriptionPlaceholder: string
  showDescriptionCounter?: boolean
}

/** Nome, descrição, orientação e formato da página: os mesmos campos ao criar e ao editar. */
export function TemplateFormFields({
  idPrefix,
  draft,
  onChange,
  nameLabel,
  namePlaceholder,
  descriptionLabel,
  descriptionPlaceholder,
  showDescriptionCounter = false,
}: TemplateFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>{nameLabel}</Label>
        <Input
          id={`${idPrefix}-name`}
          value={draft.name}
          maxLength={120}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder={namePlaceholder}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-description`}>{descriptionLabel}</Label>
        <Textarea
          id={`${idPrefix}-description`}
          rows={4}
          maxLength={500}
          value={draft.description}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder={descriptionPlaceholder}
        />
        {showDescriptionCounter ? (
          <p className="text-right text-xs text-slate-600 dark:text-slate-400">
            {draft.description.length}/500 caracteres
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-orientation`}>Orientação</Label>
          <Select
            value={draft.orientation}
            onValueChange={(value) =>
              onChange({ orientation: value as CertificateTemplateOrientation })
            }
          >
            <SelectTrigger id={`${idPrefix}-orientation`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="landscape">Paisagem (landscape)</SelectItem>
              <SelectItem value="portrait">Retrato (portrait)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-page-size`}>Formato da página</Label>
          <Select value={draft.pageSize} onValueChange={(pageSize) => onChange({ pageSize })}>
            <SelectTrigger id={`${idPrefix}-page-size`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  )
}
