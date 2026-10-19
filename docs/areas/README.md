# Áreas do sistema

Cada documento descreve uma área: o que ela faz, as rotas da API, as regras de negócio, as proteções de
segurança e as limitações conhecidas. A visão consolidada de segurança está em
[`../seguranca.md`](../seguranca.md) e a arquitetura geral em [`../arquitetura.md`](../arquitetura.md).

| Área                                                   | Documento                            |
| ------------------------------------------------------ | ------------------------------------ |
| Catálogo público, busca, perfil do instrutor           | [catalogo.md](catalogo.md)           |
| Configurações, categorias, banners, vitrines e blog    | [conteudo.md](conteudo.md)           |
| Checkout, pagamentos, cupons e financeiro              | [checkout.md](checkout.md)           |
| Área do aluno (player, quiz, notas, perguntas, perfil) | [aluno.md](aluno.md)                 |
| Criação e administração de cursos                      | [cursos.md](cursos.md)               |
| Painel do produtor, saques, candidatura e contatos     | [produtor.md](produtor.md)           |
| Usuários do admin, suporte, chat e notificações        | [admin-suporte.md](admin-suporte.md) |
| Certificados                                           | [certificados.md](certificados.md)   |
| Afiliados                                              | [afiliados.md](afiliados.md)         |

## Estrutura de cada documento

1. O que a área faz e onde está o código (módulos da API e pastas do front).
2. Rotas principais, com a regra de acesso de cada uma.
3. Regras de negócio.
4. **Proteções:** ameaças e a defesa que o sistema aplica.
5. Limitações conhecidas.
