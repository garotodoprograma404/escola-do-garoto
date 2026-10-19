/** Senha das contas de exemplo em desenvolvimento. Está no código (público): só vale em banco local. */
export const DEV_PASSWORD = 'senha-dev-123'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export function isLocalDatabase(url: string | undefined): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url ?? '').hostname)
  } catch {
    return false
  }
}

/**
 * Senha de uma conta criada pelo seed. Sem a variável, só fora de produção E com banco na própria
 * máquina usa a senha de desenvolvimento; em qualquer outro caso exige uma senha própria (16+).
 * Assim ninguém sobe uma homologação com um admin de senha conhecida por quem leu o código.
 */
export function seedAccountPassword(envName: string, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[envName] ?? ''
  if (!value && env.NODE_ENV !== 'production' && isLocalDatabase(env.DATABASE_URL)) {
    return DEV_PASSWORD
  }
  if (value.length < 16) {
    throw new Error(
      `${envName} precisa ter 16+ caracteres (a senha de desenvolvimento só vale em banco local).`,
    )
  }
  return value
}
