# Certificados

Módulo `apps/api/src/modules/certificates/` (mais as telas em `apps/web`): modelos com versões, emissão
automática e manual, revogação, reemissão, download e verificação pública. Os arquivos ficam no
`FilesService`.

## Emissão automática

```ts
// apps/api/src/modules/certificates/certificates.service.ts
CertificatesService.issueForCompletedEnrollment(enrollmentId: number): Promise<IssueCertificateResult>

type IssueCertificateResult = {
  status: 'issued' | 'already_exists' | 'skipped' | 'failed'
  reason?: string           // texto em português (por que não emitiu)
  certificateId?: number
  certificateCode?: string  // PREFIXO-AAAA-XXXX-XXXX-XXXX (prefixo: CERTIFICATE_CODE_PREFIX, padrão GAROTO)
}
```

- O `CertificatesModule` registra um ouvinte no `CourseCompletionService` do módulo `learning` (ver
  [aluno.md](aluno.md)): quando o aluno chega a 100%, o certificado é emitido logo após o commit da
  conclusão. Não existe rota HTTP para esse gatilho.
- **Idempotente:** um certificado ativo por matrícula (índice único parcial). Chamar de novo, ou várias
  vezes ao mesmo tempo, devolve `already_exists` com o mesmo certificado.
- **Nunca lança.** Qualquer problema (sem modelo no curso, modelo não publicado, falha ao gravar o PDF…)
  volta como `skipped` ou `failed` com `reason`, e a conclusão do curso não é desfeita.
- Roda **depois** do commit: o método abre a própria transação e gera o PDF (E/S em disco), então não deve
  ser chamado de dentro de uma `db.transaction(...)`.
- **Elegibilidade:** `status = completed` **ou** `progress_percentage >= 100` **ou** `completed_at`
  preenchido; curso com `has_certificate = true`; modelo ativo e **publicado** no curso. Matrícula
  `cancelled` ou `refunded` nunca emite (`skipped`).
- **Efeitos:** grava `certificates` (+ `certificate_events` `issued_automatic`), grava o PDF em
  `certificates/issued/AAAA/MM/<código>.pdf` e preenche `enrollments.certificate_url` (caminho interno).

## Rotas

| Rota                                                                                                                        | Quem          | O que faz                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `POST/PATCH /api/certificates/templates`, `…/:id/publish`, `…/:id/unpublish`, `…/:id/versions`                              | admin         | modelos e versões                                                                                                          |
| `GET …/templates/:id/builder`, `POST …/templates/:id/assets?target=imagePath\|primarySignaturePath\|secondarySignaturePath` | admin         | construtor e upload de imagens (multipart, campo `file`)                                                                   |
| `GET …/templates/:id/preview`                                                                                               | admin         | devolve `{ html }`; a rota do Next só repassa                                                                              |
| `POST /api/certificates/issue`                                                                                              | admin         | emissão manual                                                                                                             |
| `POST /api/certificates/:id/revoke` `{ reason }`, `…/:id/reissue` `{ reason?, sameCode? }`                                  | admin         | revogar e reemitir                                                                                                         |
| `GET /api/certificates/issued`                                                                                              | admin         | painel de operação: `{ certificates, events }`                                                                             |
| `GET /api/certificates/me`                                                                                                  | logado        | "Meus certificados" (só os próprios)                                                                                       |
| `GET /api/certificates/:id/download`                                                                                        | dono ou admin | redireciona (302) para link assinado de **60 s**                                                                           |
| `GET /api/certificates/verify/:code`                                                                                        | público       | verificação por código (30 req/min por IP)                                                                                 |
| `GET /api/certificates/courses`, `GET …/courses/:courseId/enrollments`                                                      | admin         | cursos aprovados com o modelo ativo; matrículas do curso com a situação do certificado (telas de ligação e emissão manual) |
| `PUT /api/certificates/courses/:courseId/template` `{ templateId, versionId? }`                                             | admin         | liga um modelo ao curso                                                                                                    |

As respostas são view-models em camelCase; `code`, `status` etc. seguem o banco.

## PDF

O PDF 1.4 é escrito à mão, sem biblioteca (`certificate-pdf.renderer.ts`): uma página, Helvetica e
Helvetica-Bold, campos posicionados em % da página, A4/A3/Letter, paisagem ou retrato. Limitações: acentos
viram a letra sem acento (a fonte padrão do PDF não tem a codificação) e o fundo e as assinaturas aparecem
só no preview HTML, não no PDF.

## Regras de negócio

- Modelos com versões imutáveis; cada salvamento cria a próxima versão (número protegido por lock do
  modelo, sem repetir sob concorrência). Status `draft`, `published` e `archived`.
- Modelo ativo por curso em `course_certificate_templates` (índice único parcial); a emissão usa a
  **versão** que estava ativa no curso, mesmo que depois saiam versões novas. A chave estrangeira composta
  garante que a versão pertence ao modelo.
- Reemissão com **código novo** (padrão): o ativo antigo vira `replaced`, o novo guarda `replaced_from_id`,
  e há dois eventos `reissued_new_code` (no novo e no antigo). Reemissão com **mesmo código**
  (`sameCode: true`, evento `reissued_same_code`) só gera outro arquivo para o certificado ativo.
- Revogação: só de certificado ativo, motivo com pelo menos 5 caracteres, evento `revoked`, limpa
  `enrollments.certificate_url`.
- Tudo que escreve em mais de uma tabela roda em `db.transaction`, e o arquivo PDF é removido se a gravação
  falhar. A elegibilidade da matrícula e o status do certificado substituído são relidos com lock dentro da
  transação de emissão.
- Datas são formatadas no fuso `America/Sao_Paulo`. Erros de validação vêm em português.
- O aluno recebe `downloadUrl` (a rota da API); o caminho interno do arquivo (`file_path`) não vai para o
  front.

## Proteções

- **A verificação pública não vaza.** Devolve só situação, código, nome do aluno, curso, data de emissão e
  data de revogação; o motivo da revogação (texto livre do admin, que pode citar dado pessoal ou fraude)
  nunca sai. Código fora do formato oficial responde "não encontrado" sem consultar o banco nem repetir o
  texto. A rota tem limite de tentativas (`@Throttle`).
- **Só o admin gerencia certificados.** Toda rota de modelo, emissão manual, revogação, reemissão e painel
  tem `@Roles(['admin'])`. O `userId` de auditoria (`issued_by`, `actor_user_id`, `created_by`) vem sempre
  da sessão.
- **Ninguém emite certificado por conta própria.** O gatilho automático é um método interno e a emissão
  manual é só do admin.
- **Download conferido a cada clique.** O link da tela é uma rota da API que confere dono ou admin e entrega
  um link assinado de 60 s; aluno que pede o certificado de outro recebe 404. Nenhuma URL assinada fica
  gravada no banco: o `htmlSnapshot` guardado na emissão não leva URLs temporárias.
- **Imagens do modelo validadas.** O upload confere o conteúdo (assinatura dos bytes), o tipo e 5 MB, e o
  caminho gravado no schema do modelo só pode ser `templates/<id>/assets/...`: não dá para apontar o fundo
  para o PDF de um aluno e vê-lo no preview.
- **Código imprevisível.** O código do certificado usa `crypto.randomInt`.
- **Matrícula cancelada ou reembolsada não gera certificado.** E a compra estornada **revoga** o certificado
  ativo daquela matrícula (motivo "Compra estornada", evento `revoked` sem ator), na mesma transação do estorno.

## Limitações conhecidas

- Não há reprocessamento automático de conclusões sem certificado; quem falhou pode ser emitido
  manualmente pelo admin.
- O aluno ainda baixa o PDF de um certificado revogado ou substituído; a verificação pública mostra a
  situação.
- A página de verificação chama a API com `x-internal-key`, o que pula o limite por IP do `@Throttle`:
  limite `/certificates/verify` no proxy de borda.
- O produtor não tem tela para ver certificados nem modelos dos próprios cursos.
- Melhorias possíveis no PDF: codificação WinAnsi para acentos e imagens de fundo e assinatura.
