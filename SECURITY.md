# Política de segurança

A Escola do Garoto; guarda contas de alunos, pedidos, pagamentos e certificados, então segurança é
requisito central. Agradecemos o relato responsável de vulnerabilidades.

## Como relatar

**Não abra uma issue pública** para um problema de segurança. Use o relato privado do GitHub:

[Relatar uma vulnerabilidade](https://github.com/garotodoprograma404/escola-do-garoto/security/advisories/new)

Inclua, se possível: a versão ou o commit, os passos para reproduzir, o impacto esperado e, se tiver, uma
sugestão de correção. Não inclua dados reais de alunos ou de pagamentos.

## O que consideramos relevante

- Acesso a dados de outra pessoa (matrícula, pedido, nota, pergunta, certificado, saque).
- Contorno do login, da sessão ou dos papéis (aluno virando admin, produtor vendo curso alheio).
- Manipulação de preço, cupom, comissão, saldo ou saque.
- Webhook de pagamento aceito sem assinatura válida ou processado duas vezes.
- Vazamento de hash de senha, token, chave ou dado pessoal em resposta, log ou e-mail.
- Upload que permita executar código, sobrescrever arquivo ou baixar arquivo privado.
- XSS em conteúdo salvo (aulas, blog, certificados) ou injeção de SQL.

O panorama das proteções e o checklist de cada rota estão em [`docs/seguranca.md`](docs/seguranca.md).

## Versões com suporte

O projeto está em desenvolvimento ativo; correções de segurança são feitas na branch `main`.

## Prazos

Confirmamos o recebimento em até 7 dias e mantemos o relator informado até a correção. Pedimos que a
divulgação pública aguarde a correção estar disponível.
