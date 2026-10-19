/**
 * Nome do cookie de sessão (igual ao da API). Fica copiado aqui de propósito: o front usa
 * zod 3 e o pacote `@vox/contracts` usa zod 4, então o front importa SÓ TIPOS dele, nunca valores.
 */
export const SESSION_COOKIE_NAME = 'vox_session'
